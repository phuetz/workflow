-- Database Migration: Create Indexes for Performance Optimization
-- Version: 001
-- Description: Add indexes to improve query performance

-- Workflows table indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_is_public ON workflows(is_public);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_user_status ON workflows(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_public_category ON workflows(is_public, category) WHERE is_public = true;

-- Workflow executions table indexes
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_executions_completed_at ON workflow_executions(completed_at);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_executions_user_date ON workflow_executions(user_id, started_at DESC);

-- Node executions table indexes
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id ON node_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_node_id ON node_executions(node_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_status ON node_executions(status);
CREATE INDEX IF NOT EXISTS idx_node_executions_started_at ON node_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_node ON node_executions(execution_id, node_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;

-- API keys table indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active) WHERE is_active = true;

-- Webhooks table indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_workflow_id ON webhooks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_url ON webhooks(url);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at);

-- Scheduled jobs table indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_workflow_id ON scheduled_jobs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_is_active ON scheduled_jobs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_active_next_run ON scheduled_jobs(is_active, next_run) WHERE is_active = true;

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Workflow versions table indexes
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_version ON workflow_versions(version);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_created_at ON workflow_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_version ON workflow_versions(workflow_id, version DESC);

-- Test cases table indexes (from testingRepository)
CREATE INDEX IF NOT EXISTS idx_test_cases_workflow_id ON test_cases(workflow_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_created_by ON test_cases(created_by);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);
CREATE INDEX IF NOT EXISTS idx_test_cases_created_at ON test_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_test_cases_workflow_status ON test_cases(workflow_id, status);

-- Test executions table indexes
CREATE INDEX IF NOT EXISTS idx_test_executions_test_case_id ON test_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_executed_by ON test_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_executed_at ON test_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_test_executions_case_status ON test_executions(test_case_id, status);

-- Analytics events table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_id ON analytics_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time ON analytics_events(type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time ON analytics_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_time ON analytics_events(workflow_id, timestamp DESC);

-- Secrets table indexes
CREATE INDEX IF NOT EXISTS idx_secrets_user_id ON secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
CREATE INDEX IF NOT EXISTS idx_secrets_type ON secrets(type);
CREATE INDEX IF NOT EXISTS idx_secrets_created_at ON secrets(created_at);
CREATE INDEX IF NOT EXISTS idx_secrets_expires_at ON secrets(expires_at);
CREATE INDEX IF NOT EXISTS idx_secrets_user_name ON secrets(user_id, name);

-- Full-text search indexes (PostgreSQL specific)
-- Uncomment these if using PostgreSQL
-- CREATE INDEX IF NOT EXISTS idx_workflows_search ON workflows USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));
-- CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING gin(tags);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING gin(metadata);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_recent_executions ON workflow_executions(workflow_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_recent_workflows ON workflows(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_workflows_recent ON workflows(is_public, updated_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_active_scheduled_jobs ON scheduled_jobs(is_active, next_run ASC) WHERE is_active = true;

-- Performance statistics table for monitoring
CREATE TABLE IF NOT EXISTS query_performance_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    execution_count INTEGER DEFAULT 0,
    total_time_ms INTEGER DEFAULT 0,
    avg_time_ms INTEGER DEFAULT 0,
    max_time_ms INTEGER DEFAULT 0,
    min_time_ms INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_query_stats_hash ON query_performance_stats(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_stats_avg_time ON query_performance_stats(avg_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_query_stats_count ON query_performance_stats(execution_count DESC);