-- PostgreSQL initialization script
-- This runs on first container startup

-- Create custom schema for better organization
CREATE SCHEMA IF NOT EXISTS qa;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create common indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON qa.users(email);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON qa.tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_test_id ON qa.test_runs(test_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON qa.reports(created_at DESC);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE qadash TO postgres;
GRANT ALL ON SCHEMA qa TO postgres;