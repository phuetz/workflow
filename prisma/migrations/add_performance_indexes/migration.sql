-- Performance Optimization Migration
-- Adds indexes for frequently queried columns and composite indexes for common query patterns

-- ================================
-- WORKFLOW INDEXES
-- ================================

-- Composite index for active workflows by user
CREATE INDEX IF NOT EXISTS "idx_workflows_user_status" ON "workflows"("userId", "status") WHERE "status" = 'ACTIVE';

-- Index for template workflows
CREATE INDEX IF NOT EXISTS "idx_workflows_template" ON "workflows"("isTemplate") WHERE "isTemplate" = true;

-- Index for scheduled workflows
CREATE INDEX IF NOT EXISTS "idx_workflows_schedule" ON "workflows"("schedule") WHERE "schedule" IS NOT NULL;

-- Index for workflow search by tags
CREATE INDEX IF NOT EXISTS "idx_workflows_tags" ON "workflows" USING GIN ("tags");

-- Index for recent workflows
CREATE INDEX IF NOT EXISTS "idx_workflows_created" ON "workflows"("createdAt" DESC);

-- Index for workflow name search (case-insensitive)
CREATE INDEX IF NOT EXISTS "idx_workflows_name_trgm" ON "workflows" USING gin ("name" gin_trgm_ops);

-- Index for team workflows
CREATE INDEX IF NOT EXISTS "idx_workflows_team" ON "workflows"("teamId") WHERE "teamId" IS NOT NULL;

-- ================================
-- WORKFLOW EXECUTION INDEXES
-- ================================

-- Composite index for execution history by workflow and time
CREATE INDEX IF NOT EXISTS "idx_executions_workflow_time" ON "workflow_executions"("workflowId", "startedAt" DESC);

-- Composite index for user execution history
CREATE INDEX IF NOT EXISTS "idx_executions_user_time" ON "workflow_executions"("userId", "startedAt" DESC);

-- Index for pending/running executions (hot path)
CREATE INDEX IF NOT EXISTS "idx_executions_active" ON "workflow_executions"("status", "startedAt")
  WHERE "status" IN ('PENDING', 'RUNNING');

-- Index for failed executions requiring retry
CREATE INDEX IF NOT EXISTS "idx_executions_failed_retry" ON "workflow_executions"("status", "retryCount", "maxRetries")
  WHERE "status" = 'FAILED' AND "retryCount" < "maxRetries";

-- Index for execution duration analysis
CREATE INDEX IF NOT EXISTS "idx_executions_duration" ON "workflow_executions"("workflowId", "duration")
  WHERE "duration" IS NOT NULL;

-- Index for finished executions cleanup
CREATE INDEX IF NOT EXISTS "idx_executions_finished" ON "workflow_executions"("finishedAt")
  WHERE "finishedAt" IS NOT NULL;

-- Composite index for execution monitoring
CREATE INDEX IF NOT EXISTS "idx_executions_monitor" ON "workflow_executions"("status", "priority" DESC, "startedAt");

-- ================================
-- NODE EXECUTION INDEXES
-- ================================

-- Composite index for node execution lookup
CREATE INDEX IF NOT EXISTS "idx_node_exec_execution_node" ON "node_executions"("executionId", "nodeId");

-- Index for node execution status
CREATE INDEX IF NOT EXISTS "idx_node_exec_status" ON "node_executions"("status", "startedAt");

-- Index for node type performance analysis
CREATE INDEX IF NOT EXISTS "idx_node_exec_type_duration" ON "node_executions"("nodeType", "duration")
  WHERE "duration" IS NOT NULL;

-- ================================
-- USER & SESSION INDEXES
-- ================================

-- Index for email lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS "idx_users_email_lower" ON "users"(LOWER("email"));

-- Index for active users
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users"("status") WHERE "status" = 'ACTIVE';

-- Index for last login tracking
CREATE INDEX IF NOT EXISTS "idx_users_last_login" ON "users"("lastLoginAt" DESC NULLS LAST);

-- Composite index for session cleanup
CREATE INDEX IF NOT EXISTS "idx_sessions_cleanup" ON "user_sessions"("expiresAt", "userId")
  WHERE "expiresAt" < NOW();

-- Index for active sessions by user
CREATE INDEX IF NOT EXISTS "idx_sessions_user_active" ON "user_sessions"("userId", "lastUsedAt" DESC);

-- ================================
-- CREDENTIAL INDEXES
-- ================================

-- Composite index for user credentials by type
CREATE INDEX IF NOT EXISTS "idx_credentials_user_type" ON "credentials"("userId", "type", "isActive");

-- Index for active credentials
CREATE INDEX IF NOT EXISTS "idx_credentials_active" ON "credentials"("isActive") WHERE "isActive" = true;

-- Index for expiring credentials
CREATE INDEX IF NOT EXISTS "idx_credentials_expiring" ON "credentials"("expiresAt")
  WHERE "expiresAt" IS NOT NULL AND "expiresAt" > NOW();

-- ================================
-- WEBHOOK INDEXES
-- ================================

-- Index for active webhooks
CREATE INDEX IF NOT EXISTS "idx_webhooks_active" ON "webhooks"("isActive", "workflowId") WHERE "isActive" = true;

-- Index for webhook URL lookup
CREATE INDEX IF NOT EXISTS "idx_webhooks_url_hash" ON "webhooks"(MD5("url"));

-- Composite index for webhook events processing
CREATE INDEX IF NOT EXISTS "idx_webhook_events_process" ON "webhook_events"("processed", "createdAt")
  WHERE "processed" = false;

-- Index for recent webhook events
CREATE INDEX IF NOT EXISTS "idx_webhook_events_recent" ON "webhook_events"("webhookId", "createdAt" DESC);

-- ================================
-- ANALYTICS INDEXES
-- ================================

-- Composite index for workflow analytics queries
CREATE INDEX IF NOT EXISTS "idx_analytics_workflow_date" ON "workflow_analytics"("workflowId", "date" DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS "idx_analytics_date_range" ON "workflow_analytics"("date" DESC);

-- Index for performance metrics
CREATE INDEX IF NOT EXISTS "idx_analytics_duration" ON "workflow_analytics"("avgDuration", "date")
  WHERE "avgDuration" IS NOT NULL;

-- Composite index for system metrics time-series
CREATE INDEX IF NOT EXISTS "idx_system_metrics_ts" ON "system_metrics"("metricType", "timestamp" DESC);

-- Index for recent metrics
CREATE INDEX IF NOT EXISTS "idx_system_metrics_recent" ON "system_metrics"("timestamp" DESC);

-- ================================
-- NOTIFICATION INDEXES
-- ================================

-- Composite index for unread notifications
CREATE INDEX IF NOT EXISTS "idx_notifications_unread" ON "notifications"("userId", "read", "createdAt" DESC)
  WHERE "read" = false;

-- Index for notification priority
CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "notifications"("userId", "priority", "createdAt" DESC);

-- Index for expired notifications cleanup
CREATE INDEX IF NOT EXISTS "idx_notifications_expired" ON "notifications"("expiresAt")
  WHERE "expiresAt" IS NOT NULL AND "expiresAt" < NOW();

-- ================================
-- AUDIT LOG INDEXES
-- ================================

-- Composite index for audit log queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_time" ON "audit_logs"("userId", "timestamp" DESC);

-- Index for action type filtering
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action", "timestamp" DESC);

-- Index for resource tracking
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs"("resource", "resourceId", "timestamp" DESC);

-- Index for recent audit logs
CREATE INDEX IF NOT EXISTS "idx_audit_logs_recent" ON "audit_logs"("timestamp" DESC);

-- ================================
-- API KEY INDEXES
-- ================================

-- Index for active API keys
CREATE INDEX IF NOT EXISTS "idx_api_keys_active" ON "api_keys"("isActive", "userId") WHERE "isActive" = true;

-- Index for API key expiration
CREATE INDEX IF NOT EXISTS "idx_api_keys_expires" ON "api_keys"("expiresAt")
  WHERE "expiresAt" IS NOT NULL AND "expiresAt" > NOW();

-- ================================
-- FILE STORAGE INDEXES
-- ================================

-- Composite index for user files
CREATE INDEX IF NOT EXISTS "idx_files_user_created" ON "files"("userId", "createdAt" DESC);

-- Index for workflow files
CREATE INDEX IF NOT EXISTS "idx_files_workflow" ON "files"("workflowId") WHERE "workflowId" IS NOT NULL;

-- Index for file type filtering
CREATE INDEX IF NOT EXISTS "idx_files_mimetype" ON "files"("mimetype");

-- ================================
-- TEAM & SHARING INDEXES
-- ================================

-- Composite index for team member lookup
CREATE INDEX IF NOT EXISTS "idx_team_members_user" ON "team_members"("userId", "role");

-- Composite index for workflow sharing
CREATE INDEX IF NOT EXISTS "idx_workflow_shares_user" ON "workflow_shares"("userId", "permission");

-- Index for active shares
CREATE INDEX IF NOT EXISTS "idx_workflow_shares_active" ON "workflow_shares"("workflowId", "expiresAt")
  WHERE "expiresAt" IS NULL OR "expiresAt" > NOW();

-- ================================
-- COMMENT INDEXES
-- ================================

-- Composite index for workflow comments
CREATE INDEX IF NOT EXISTS "idx_comments_workflow_created" ON "comments"("workflowId", "createdAt" DESC);

-- Index for unresolved comments
CREATE INDEX IF NOT EXISTS "idx_comments_unresolved" ON "comments"("workflowId", "resolved") WHERE "resolved" = false;

-- Index for node-specific comments
CREATE INDEX IF NOT EXISTS "idx_comments_node" ON "comments"("nodeId") WHERE "nodeId" IS NOT NULL;

-- ================================
-- EXTENSIONS
-- ================================

-- Enable pg_trgm extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for multi-column GIN indexes (if not already enabled)
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ================================
-- STATISTICS
-- ================================

-- Update table statistics for query planner
ANALYZE "workflows";
ANALYZE "workflow_executions";
ANALYZE "node_executions";
ANALYZE "users";
ANALYZE "user_sessions";
ANALYZE "credentials";
ANALYZE "webhooks";
ANALYZE "webhook_events";
ANALYZE "workflow_analytics";
ANALYZE "system_metrics";
ANALYZE "notifications";
ANALYZE "audit_logs";

-- ================================
-- VACUUM
-- ================================

-- Vacuum tables to reclaim space and update statistics
VACUUM ANALYZE "workflows";
VACUUM ANALYZE "workflow_executions";
VACUUM ANALYZE "node_executions";
