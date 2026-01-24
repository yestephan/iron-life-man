-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  race_date DATE NOT NULL,
  fitness_level VARCHAR(20) NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  target_hours_per_week INTEGER NOT NULL CHECK (target_hours_per_week >= 6 AND target_hours_per_week <= 20),
  weekday_time TIME NOT NULL,
  weekend_time TIME NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  google_calendar_id VARCHAR(255),
  google_access_token TEXT,
  google_refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts table
CREATE TABLE workouts (
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
  google_event_id VARCHAR(255),
  week_number INTEGER NOT NULL,
  phase VARCHAR(10) NOT NULL CHECK (phase IN ('base', 'build', 'peak', 'taper')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_profiles_race_date ON profiles(race_date);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, scheduled_date);
CREATE INDEX idx_workouts_user_week ON workouts(user_id, week_number);
CREATE INDEX idx_workouts_user_status ON workouts(user_id, status);
CREATE INDEX idx_workouts_google_event ON workouts(google_event_id) WHERE google_event_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- RLS Policies for workouts
-- Users can read their own workouts
CREATE POLICY "Users can read own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own workouts
CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own workouts
CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on workouts
CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
