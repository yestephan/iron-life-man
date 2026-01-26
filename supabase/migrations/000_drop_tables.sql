-- ============================================================================
-- DROP ALL TABLES MIGRATION
-- ============================================================================
-- This migration drops all application tables, indexes, triggers, policies,
-- and functions while preserving auth.users and the auth schema.
--
-- WARNING: This will delete ALL data in the application tables!
-- Use with caution, especially in production environments.
--
-- Note: Using CASCADE automatically drops all dependent objects:
--   - Indexes
--   - Foreign key constraints  
--   - Triggers
--   - Policies (RLS)
--   - Any other dependent objects
-- ============================================================================

-- ============================================================================
-- DROP TABLES (CASCADE automatically drops triggers, policies, and constraints)
-- ============================================================================
-- Tables are dropped in order to respect foreign key constraints.
-- Using CASCADE to automatically drop dependent objects.

-- Drop tables that reference other application tables first
DROP TABLE IF EXISTS personal_records CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS training_preferences CASCADE;

-- Drop tables that only reference auth.users
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS training_zones CASCADE;
DROP TABLE IF EXISTS body_metrics CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS races CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ============================================================================
-- DROP FUNCTIONS (after tables are dropped)
-- ============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Uncomment the following to verify all tables are dropped:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_type = 'BASE TABLE'
--   AND table_name NOT LIKE 'pg_%'
-- ORDER BY table_name;
