-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER PROFILES - Personal information (separate from training preferences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  location VARCHAR(255),
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. USER SETTINGS - App preferences and configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Units
  distance_unit VARCHAR(10) DEFAULT 'km' CHECK (distance_unit IN ('km', 'mi')),
  weight_unit VARCHAR(10) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  temperature_unit VARCHAR(10) DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),

  -- Notifications
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  workout_reminders BOOLEAN DEFAULT true,
  reminder_minutes_before INTEGER DEFAULT 60,

  -- Display
  theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language VARCHAR(10) DEFAULT 'en',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. RACES - Multiple target races per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Race details
  race_name VARCHAR(255) NOT NULL,
  race_date DATE NOT NULL,
  race_type VARCHAR(50) NOT NULL CHECK (race_type IN ('sprint', 'olympic', 'half', 'full', 'other')),
  location VARCHAR(255),

  -- Priority and status
  priority CHAR(1) CHECK (priority IN ('A', 'B', 'C')),
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled', 'dns', 'dnf')),

  -- Distances
  swim_distance_km DECIMAL(5,2),
  bike_distance_km DECIMAL(6,2),
  run_distance_km DECIMAL(5,2),

  -- Results (filled after completion)
  total_time_seconds INTEGER,
  swim_time_seconds INTEGER,
  t1_time_seconds INTEGER,
  bike_time_seconds INTEGER,
  t2_time_seconds INTEGER,
  run_time_seconds INTEGER,
  overall_place INTEGER,
  division_place INTEGER,

  -- Notes
  notes TEXT,
  race_report TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TRAINING PREFERENCES - Separate from user profile, linked to races
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_race_id UUID REFERENCES races(id) ON DELETE SET NULL,

  -- Training configuration
  fitness_level VARCHAR(20) NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  target_hours_per_week INTEGER NOT NULL CHECK (target_hours_per_week >= 6 AND target_hours_per_week <= 20),

  -- Availability
  weekday_time TIME NOT NULL,
  weekend_time TIME NOT NULL,

  -- Period
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one active preference per user
  CONSTRAINT unique_active_preference
    EXCLUDE (user_id WITH =) WHERE (is_active = true)
);

-- ============================================================================
-- 5. WORKOUTS - Planned workouts (existing table, kept as is)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline VARCHAR(10) NOT NULL CHECK (discipline IN ('swim', 'bike', 'run')),
  workout_type VARCHAR(20) NOT NULL CHECK (workout_type IN ('easy', 'tempo', 'intervals', 'long')),
  duration_minutes INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  week_number INTEGER NOT NULL,
  phase VARCHAR(10) NOT NULL CHECK (phase IN ('base', 'build', 'peak', 'taper')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. EQUIPMENT - Bikes, shoes, wetsuits, etc.
-- ============================================================================
-- Created before workout_logs since workout_logs references equipment
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Equipment details
  type VARCHAR(50) NOT NULL CHECK (type IN ('bike', 'running_shoes', 'wetsuit', 'goggles', 'helmet', 'other')),
  brand VARCHAR(100),
  model VARCHAR(100),
  nickname VARCHAR(100),

  -- Lifecycle
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  retirement_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retired', 'maintenance', 'sold')),

  -- Usage tracking
  total_distance_km DECIMAL(8,2) DEFAULT 0,
  total_duration_hours DECIMAL(8,2) DEFAULT 0,

  -- Maintenance
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_notes TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. WORKOUT LOGS - Actual workout execution and performance data
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Completion
  completed_at TIMESTAMPTZ NOT NULL,

  -- Performance metrics
  distance_km DECIMAL(6,2),
  duration_seconds INTEGER,
  avg_pace_min_per_km DECIMAL(5,2),
  avg_speed_kph DECIMAL(5,2),

  -- Heart rate
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,

  -- Power (cycling)
  avg_power_watts INTEGER,
  normalized_power_watts INTEGER,

  -- Effort
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),

  -- Environmental
  temperature_celsius DECIMAL(4,1),
  weather_conditions VARCHAR(50),

  -- Equipment (references equipment table created above)
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,

  -- Feedback
  athlete_notes TEXT,
  feeling VARCHAR(20) CHECK (feeling IN ('terrible', 'poor', 'ok', 'good', 'great')),

  -- Data source
  data_source VARCHAR(50), -- 'manual', 'strava', 'garmin', etc.
  external_id VARCHAR(255), -- ID from external service

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One log per workout
  UNIQUE(workout_id)
);

-- ============================================================================
-- 8. BODY METRICS - Track weight, HR, HRV over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  recorded_at TIMESTAMPTZ NOT NULL,

  -- Body composition
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass_kg DECIMAL(5,2),

  -- Cardiovascular
  resting_heart_rate INTEGER,
  hrv_score INTEGER,

  -- Recovery
  sleep_hours DECIMAL(3,1),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  fatigue_level INTEGER CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one entry per user per timestamp
  UNIQUE(user_id, recorded_at)
);

-- ============================================================================
-- 9. TRAINING ZONES - HR, power, and pace zones per discipline
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  discipline VARCHAR(10) NOT NULL CHECK (discipline IN ('swim', 'bike', 'run')),
  zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('heart_rate', 'power', 'pace')),

  -- 5 zones (most common for endurance training)
  zone1_min DECIMAL(6,2) NOT NULL,
  zone1_max DECIMAL(6,2) NOT NULL,
  zone2_min DECIMAL(6,2) NOT NULL,
  zone2_max DECIMAL(6,2) NOT NULL,
  zone3_min DECIMAL(6,2) NOT NULL,
  zone3_max DECIMAL(6,2) NOT NULL,
  zone4_min DECIMAL(6,2) NOT NULL,
  zone4_max DECIMAL(6,2) NOT NULL,
  zone5_min DECIMAL(6,2) NOT NULL,
  zone5_max DECIMAL(6,2) NOT NULL,

  -- Validity period
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active zone set per user/discipline/type
  CONSTRAINT unique_active_zone
    EXCLUDE (user_id WITH =, discipline WITH =, zone_type WITH =)
    WHERE (is_active = true)
);

-- ============================================================================
-- 10. PERSONAL RECORDS - PRs per distance/discipline
-- ============================================================================
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  discipline VARCHAR(10) NOT NULL CHECK (discipline IN ('swim', 'bike', 'run')),
  distance_km DECIMAL(6,2) NOT NULL,

  -- Record details
  time_seconds INTEGER NOT NULL,
  avg_pace_min_per_km DECIMAL(5,2),
  avg_speed_kph DECIMAL(5,2),

  -- When and where
  achieved_at TIMESTAMPTZ NOT NULL,
  race_id UUID REFERENCES races(id) ON DELETE SET NULL,
  location VARCHAR(255),

  -- Supporting data
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE SET NULL,
  external_id VARCHAR(255), -- Strava, Garmin, etc.

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. INTEGRATIONS - External service connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google_calendar', 'strava', 'garmin', 'trainingpeaks', 'whoop', 'other')),
  provider_user_id VARCHAR(255),

  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Provider-specific data
  calendar_id VARCHAR(255), -- For Google Calendar
  sync_settings JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  last_sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One integration per user per provider
  UNIQUE(user_id, provider)
);

-- ============================================================================
-- INDEXES for query performance
-- ============================================================================

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone ON user_profiles(timezone);

-- Races
CREATE INDEX IF NOT EXISTS idx_races_user_date ON races(user_id, race_date);
CREATE INDEX IF NOT EXISTS idx_races_user_status ON races(user_id, status);
CREATE INDEX IF NOT EXISTS idx_races_date ON races(race_date) WHERE status = 'upcoming';

-- Training preferences
CREATE INDEX IF NOT EXISTS idx_training_prefs_user_active ON training_preferences(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_training_prefs_race ON training_preferences(target_race_id) WHERE target_race_id IS NOT NULL;

-- Workouts
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workouts_user_week ON workouts(user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_workouts_user_status ON workouts(user_id, status);

-- Workout logs
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout ON workout_logs(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_workout_logs_equipment ON workout_logs(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_external ON workout_logs(data_source, external_id) WHERE external_id IS NOT NULL;

-- Equipment
CREATE INDEX IF NOT EXISTS idx_equipment_user_status ON equipment(user_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(user_id, type, status);

-- Body metrics
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON body_metrics(user_id, recorded_at DESC);

-- Training zones
CREATE INDEX IF NOT EXISTS idx_training_zones_user_active ON training_zones(user_id, discipline, zone_type, is_active);

-- Personal records
CREATE INDEX IF NOT EXISTS idx_prs_user_discipline ON personal_records(user_id, discipline, distance_km);
CREATE INDEX IF NOT EXISTS idx_prs_achieved ON personal_records(achieved_at DESC);

-- Integrations
CREATE INDEX IF NOT EXISTS idx_integrations_user_active ON integrations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider, is_active);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
-- Used by triggers defined in 002_triggers.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- Notes:
--   - Triggers are defined in 002_triggers.sql
--   - Row Level Security (RLS) policies are defined in 003_policies.sql
-- ============================================================================
