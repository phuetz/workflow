-- Database Initialization Script
-- This script is run during Docker container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create database if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workflow_db') THEN
        CREATE DATABASE workflow_db;
    END IF;
END
$$;

-- Create test database if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workflow_test') THEN
        CREATE DATABASE workflow_test;
    END IF;
END
$$;

-- Create user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'workflow_user') THEN
        CREATE USER workflow_user WITH PASSWORD 'workflow_password';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE workflow_db TO workflow_user;
GRANT ALL PRIVILEGES ON DATABASE workflow_test TO workflow_user;

-- Connect to workflow_db and set up additional configurations
\c workflow_db;

-- Enable row level security
-- ALTER DATABASE workflow_db SET row_security = on;

-- Create indexes for performance
-- These will be created by Prisma migrations, but keeping here for reference
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Set up connection pooling parameters
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();