-- Performance Optimization Indexes Migration
-- Adds composite and single-column indexes for common query patterns

-- Workflow indexes for common queries
CREATE INDEX IF NOT EXISTS "workflows_createdAt_idx" ON "workflows"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "workflows_updatedAt_idx" ON "workflows"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "workflows_userId_status_idx" ON "workflows"("userId", "status");
CREATE INDEX IF NOT EXISTS "workflows_userId_createdAt_idx" ON "workflows"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "workflows_teamId_idx" ON "workflows"("teamId");
CREATE INDEX IF NOT EXISTS "workflows_isTemplate_idx" ON "workflows"("isTemplate");

-- Execution indexes for performance queries
CREATE INDEX IF NOT EXISTS "workflow_executions_finishedAt_idx" ON "workflow_executions"("finishedAt" DESC);
CREATE INDEX IF NOT EXISTS "workflow_executions_workflowId_status_idx" ON "workflow_executions"("workflowId", "status");
CREATE INDEX IF NOT EXISTS "workflow_executions_workflowId_startedAt_idx" ON "workflow_executions"("workflowId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "workflow_executions_userId_status_idx" ON "workflow_executions"("userId", "status");
CREATE INDEX IF NOT EXISTS "workflow_executions_userId_startedAt_idx" ON "workflow_executions"("userId", "startedAt" DESC);

-- Node execution indexes
CREATE INDEX IF NOT EXISTS "node_executions_startedAt_idx" ON "node_executions"("startedAt" DESC);
CREATE INDEX IF NOT EXISTS "node_executions_status_idx" ON "node_executions"("status");
CREATE INDEX IF NOT EXISTS "node_executions_executionId_status_idx" ON "node_executions"("executionId", "status");

-- Analytics indexes for aggregation queries
CREATE INDEX IF NOT EXISTS "workflow_analytics_date_idx" ON "workflow_analytics"("date" DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS "comments_createdAt_idx" ON "comments"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "comments_resolved_idx" ON "comments"("resolved");
CREATE INDEX IF NOT EXISTS "comments_workflowId_resolved_idx" ON "comments"("workflowId", "resolved");

-- Notification indexes
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- Credential indexes
CREATE INDEX IF NOT EXISTS "credentials_isActive_idx" ON "credentials"("isActive");
CREATE INDEX IF NOT EXISTS "credentials_userId_type_idx" ON "credentials"("userId", "type");

-- Webhook indexes
CREATE INDEX IF NOT EXISTS "webhooks_isActive_idx" ON "webhooks"("isActive");
CREATE INDEX IF NOT EXISTS "webhook_events_createdAt_idx" ON "webhook_events"("createdAt" DESC);

-- Session indexes for faster lookups
CREATE INDEX IF NOT EXISTS "user_sessions_userId_expiresAt_idx" ON "user_sessions"("userId", "expiresAt" DESC);

-- Audit log performance
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs"("resource");
CREATE INDEX IF NOT EXISTS "audit_logs_resourceId_idx" ON "audit_logs"("resourceId");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp" DESC);

-- Analyze tables for query planner
ANALYZE workflows;
ANALYZE workflow_executions;
ANALYZE node_executions;
ANALYZE workflow_analytics;
ANALYZE users;
ANALYZE credentials;
ANALYZE webhooks;
