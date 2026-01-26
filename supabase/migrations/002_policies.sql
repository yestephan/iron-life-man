-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- This migration sets up Row Level Security policies for all application tables.
-- It must run after 001_schema.sql to ensure tables exist.
--
-- All policies are idempotent - they can be run multiple times safely.
-- ============================================================================

-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
CREATE POLICY "Users can delete own profile" ON user_profiles FOR DELETE USING (auth.uid() = id);

-- User settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
CREATE POLICY "Users can read own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- Races
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own races" ON races;
CREATE POLICY "Users can read own races" ON races FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own races" ON races;
CREATE POLICY "Users can insert own races" ON races FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own races" ON races;
CREATE POLICY "Users can update own races" ON races FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own races" ON races;
CREATE POLICY "Users can delete own races" ON races FOR DELETE USING (auth.uid() = user_id);

-- Training preferences
ALTER TABLE training_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own preferences" ON training_preferences;
CREATE POLICY "Users can read own preferences" ON training_preferences FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own preferences" ON training_preferences;
CREATE POLICY "Users can insert own preferences" ON training_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own preferences" ON training_preferences;
CREATE POLICY "Users can update own preferences" ON training_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own preferences" ON training_preferences;
CREATE POLICY "Users can delete own preferences" ON training_preferences FOR DELETE USING (auth.uid() = user_id);

-- Workouts
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own workouts" ON workouts;
CREATE POLICY "Users can read own workouts" ON workouts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
CREATE POLICY "Users can insert own workouts" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
CREATE POLICY "Users can update own workouts" ON workouts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
CREATE POLICY "Users can delete own workouts" ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout logs
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own logs" ON workout_logs;
CREATE POLICY "Users can read own logs" ON workout_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own logs" ON workout_logs;
CREATE POLICY "Users can insert own logs" ON workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own logs" ON workout_logs;
CREATE POLICY "Users can update own logs" ON workout_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own logs" ON workout_logs;
CREATE POLICY "Users can delete own logs" ON workout_logs FOR DELETE USING (auth.uid() = user_id);

-- Equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own equipment" ON equipment;
CREATE POLICY "Users can read own equipment" ON equipment FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own equipment" ON equipment;
CREATE POLICY "Users can insert own equipment" ON equipment FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own equipment" ON equipment;
CREATE POLICY "Users can update own equipment" ON equipment FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own equipment" ON equipment;
CREATE POLICY "Users can delete own equipment" ON equipment FOR DELETE USING (auth.uid() = user_id);

-- Body metrics
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own metrics" ON body_metrics;
CREATE POLICY "Users can read own metrics" ON body_metrics FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own metrics" ON body_metrics;
CREATE POLICY "Users can insert own metrics" ON body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own metrics" ON body_metrics;
CREATE POLICY "Users can update own metrics" ON body_metrics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own metrics" ON body_metrics;
CREATE POLICY "Users can delete own metrics" ON body_metrics FOR DELETE USING (auth.uid() = user_id);

-- Training zones
ALTER TABLE training_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own zones" ON training_zones;
CREATE POLICY "Users can read own zones" ON training_zones FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own zones" ON training_zones;
CREATE POLICY "Users can insert own zones" ON training_zones FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own zones" ON training_zones;
CREATE POLICY "Users can update own zones" ON training_zones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own zones" ON training_zones;
CREATE POLICY "Users can delete own zones" ON training_zones FOR DELETE USING (auth.uid() = user_id);

-- Personal records
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own PRs" ON personal_records;
CREATE POLICY "Users can read own PRs" ON personal_records FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own PRs" ON personal_records;
CREATE POLICY "Users can insert own PRs" ON personal_records FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own PRs" ON personal_records;
CREATE POLICY "Users can update own PRs" ON personal_records FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own PRs" ON personal_records;
CREATE POLICY "Users can delete own PRs" ON personal_records FOR DELETE USING (auth.uid() = user_id);

-- Integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own integrations" ON integrations;
CREATE POLICY "Users can read own integrations" ON integrations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own integrations" ON integrations;
CREATE POLICY "Users can insert own integrations" ON integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own integrations" ON integrations;
CREATE POLICY "Users can update own integrations" ON integrations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own integrations" ON integrations;
CREATE POLICY "Users can delete own integrations" ON integrations FOR DELETE USING (auth.uid() = user_id);
