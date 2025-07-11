-- WorkflowBuilder Pro - PostgreSQL Database Schema
-- Version: 1.0
-- Created: 2024-12-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- USERS & AUTHENTICATION
-- ================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'microsoft'
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  token_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- ================================
-- WORKFLOWS
-- ================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  tags TEXT[] DEFAULT '{}',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT FALSE,
  template_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  changelog TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workflow_id, version)
);

CREATE TABLE workflow_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_email VARCHAR(255),
  permission VARCHAR(50) NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- EXECUTIONS
-- ================================

CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  mode VARCHAR(50) DEFAULT 'trigger' CHECK (mode IN ('trigger', 'manual', 'retry', 'test')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_data JSONB DEFAULT '{}',
  execution_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  node_id VARCHAR(255),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- CREDENTIALS
-- ================================

CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'oauth2', 'api_key', 'basic_auth', 'jwt'
  data JSONB NOT NULL, -- Encrypted credential data
  encrypted_data TEXT, -- Additional encrypted fields
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- WEBHOOKS
-- ================================

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  path VARCHAR(255) UNIQUE NOT NULL,
  method VARCHAR(10) DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  is_active BOOLEAN DEFAULT TRUE,
  auth_required BOOLEAN DEFAULT FALSE,
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES executions(id),
  method VARCHAR(10) NOT NULL,
  headers JSONB DEFAULT '{}',
  body JSONB DEFAULT '{}',
  response_status INTEGER,
  response_body JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SCHEDULES
-- ================================

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  cron_expression VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- QUEUE SYSTEM
-- ================================

CREATE TABLE job_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  job_data JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'failed', 'delayed')),
  process_after TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- AUDIT LOGS
-- ================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB DEFAULT '{}',
  new_values JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SYSTEM SETTINGS
-- ================================

CREATE TABLE system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Workflows
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_tags ON workflows USING GIN(tags);
CREATE INDEX idx_workflows_updated_at ON workflows(updated_at);
CREATE INDEX idx_workflow_shares_workflow_id ON workflow_shares(workflow_id);

-- Executions
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_created_at ON executions(created_at);
CREATE INDEX idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX idx_execution_logs_level ON execution_logs(level);

-- Credentials
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_type ON credentials(type);

-- Webhooks
CREATE INDEX idx_webhooks_workflow_id ON webhooks(workflow_id);
CREATE INDEX idx_webhooks_path ON webhooks(path);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);

-- Schedules
CREATE INDEX idx_schedules_workflow_id ON schedules(workflow_id);
CREATE INDEX idx_schedules_next_run_at ON schedules(next_run_at);
CREATE INDEX idx_schedules_is_active ON schedules(is_active);

-- Queue
CREATE INDEX idx_job_queues_queue_name ON job_queues(queue_name);
CREATE INDEX idx_job_queues_status ON job_queues(status);
CREATE INDEX idx_job_queues_process_after ON job_queues(process_after);

-- Audit
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ================================
-- TRIGGERS FOR UPDATED_AT
-- ================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- DEFAULT SYSTEM SETTINGS
-- ================================

INSERT INTO system_settings (key, value, description, is_public) VALUES
('app_name', '"WorkflowBuilder Pro"', 'Application name', true),
('max_executions_per_user', '1000', 'Maximum executions per user per month', false),
('max_workflows_per_user', '100', 'Maximum workflows per user', false),
('enable_user_registration', 'true', 'Allow new user registration', true),
('enable_oauth_google', 'true', 'Enable Google OAuth', true),
('enable_oauth_github', 'true', 'Enable GitHub OAuth', true),
('default_timezone', '"UTC"', 'Default timezone for schedules', true),
('webhook_rate_limit', '1000', 'Default webhook rate limit per hour', false);

-- ================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ================================

-- Sample admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@workflowbuilder.com', 
 crypt('admin123', gen_salt('bf')), 'Admin', 'User', 'admin', true);

-- Sample workflow
INSERT INTO workflows (id, user_id, name, description, status, tags, nodes, edges) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000',
 'Welcome Email Automation', 'Send welcome emails to new users', 'active',
 ARRAY['email', 'automation'],
 '[{"id": "1", "type": "webhook", "position": {"x": 100, "y": 100}}]'::jsonb,
 '[]'::jsonb);

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE workflows IS 'Workflow definitions and metadata';
COMMENT ON TABLE executions IS 'Workflow execution history and results';
COMMENT ON TABLE credentials IS 'Encrypted user credentials for integrations';
COMMENT ON TABLE webhooks IS 'Webhook endpoints for workflow triggers';
COMMENT ON TABLE schedules IS 'Scheduled workflow executions';
COMMENT ON TABLE job_queues IS 'Background job queue for async processing';
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';