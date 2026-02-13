-- ============================================
-- PostgreSQL Initialization Script
-- Workflow Automation Platform
-- ============================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create additional schemas
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set default permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO workflow;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO workflow;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT, INSERT ON TABLES TO workflow;

-- Create audit logging function
CREATE OR REPLACE FUNCTION audit.log_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.activity_log (table_name, operation, new_data, created_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.activity_log (table_name, operation, old_data, new_data, created_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.activity_log (table_name, operation, old_data, created_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.activity_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    user_id INTEGER,
    ip_address INET
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_table ON audit.activity_log(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON audit.activity_log(created_at);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE workflow TO workflow;
GRANT ALL PRIVILEGES ON SCHEMA public TO workflow;
GRANT ALL PRIVILEGES ON SCHEMA analytics TO workflow;
GRANT ALL PRIVILEGES ON SCHEMA audit TO workflow;

-- Set optimal configuration for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
