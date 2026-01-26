-- ============================================================================
-- SEED DATA FOR ALL AUTHENTICATED USERS
-- ============================================================================
-- This migration creates sample data for all users in auth.users.
-- It is idempotent - can be run multiple times safely.
--
-- Creates:
--   - User profiles with basic info
--   - User settings with defaults
--   - Sample races (1-2 per user)
--   - Training preferences linked to races
--   - Sample equipment (bike, shoes, wetsuit)
--   - Sample workouts (2-3 weeks worth)
--   - Sample workout logs (some completed workouts)
--   - Sample body metrics (recent entries)
--   - Training zones (HR zones for each discipline)
--   - Personal records (sample PRs)
--
-- Note: This uses deterministic data based on user ID hash for consistency
-- ============================================================================

-- Helper function to generate deterministic "random" values based on user ID
-- This ensures the same user always gets the same seed data
CREATE OR REPLACE FUNCTION seed_hash(text_value TEXT, seed INTEGER DEFAULT 0)
RETURNS INTEGER AS $$
BEGIN
  RETURN abs(hashtext(text_value || seed::TEXT)) % 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 1. USER PROFILES
-- ============================================================================
INSERT INTO user_profiles (id, full_name, display_name, bio, date_of_birth, gender, location, timezone)
SELECT 
  u.id,
  CASE (seed_hash(u.id::TEXT, 1) % 3)
    WHEN 0 THEN 'Alex Johnson'
    WHEN 1 THEN 'Sam Martinez'
    ELSE 'Jordan Chen'
  END as full_name,
  CASE (seed_hash(u.id::TEXT, 2) % 3)
    WHEN 0 THEN 'Alex'
    WHEN 1 THEN 'Sam'
    ELSE 'Jordan'
  END as display_name,
  CASE (seed_hash(u.id::TEXT, 3) % 3)
    WHEN 0 THEN 'Training for my first Ironman!'
    WHEN 1 THEN 'Triathlete | Coffee enthusiast | Early morning swimmer'
    ELSE 'Building endurance, one workout at a time'
  END as bio,
  (CURRENT_DATE - INTERVAL '25 years' - (seed_hash(u.id::TEXT, 4) % 20 || ' years')::INTERVAL)::DATE as date_of_birth,
  CASE (seed_hash(u.id::TEXT, 5) % 4)
    WHEN 0 THEN 'male'
    WHEN 1 THEN 'female'
    WHEN 2 THEN 'other'
    ELSE 'prefer_not_to_say'
  END as gender,
  CASE (seed_hash(u.id::TEXT, 6) % 5)
    WHEN 0 THEN 'San Francisco, CA'
    WHEN 1 THEN 'Boulder, CO'
    WHEN 2 THEN 'Austin, TX'
    WHEN 3 THEN 'Portland, OR'
    ELSE 'Seattle, WA'
  END as location,
  CASE (seed_hash(u.id::TEXT, 7) % 4)
    WHEN 0 THEN 'America/Los_Angeles'
    WHEN 1 THEN 'America/Denver'
    WHEN 2 THEN 'America/Chicago'
    ELSE 'America/New_York'
  END as timezone
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USER SETTINGS
-- ============================================================================
INSERT INTO user_settings (
  user_id, 
  distance_unit, 
  weight_unit, 
  temperature_unit,
  email_notifications,
  push_notifications,
  workout_reminders,
  reminder_minutes_before,
  theme,
  language
)
SELECT 
  u.id,
  CASE (seed_hash(u.id::TEXT, 10) % 2) WHEN 0 THEN 'km' ELSE 'mi' END,
  CASE (seed_hash(u.id::TEXT, 11) % 2) WHEN 0 THEN 'kg' ELSE 'lbs' END,
  CASE (seed_hash(u.id::TEXT, 12) % 2) WHEN 0 THEN 'celsius' ELSE 'fahrenheit' END,
  (seed_hash(u.id::TEXT, 13) % 2)::BOOLEAN,
  (seed_hash(u.id::TEXT, 14) % 2)::BOOLEAN,
  true,
  60,
  CASE (seed_hash(u.id::TEXT, 15) % 3)
    WHEN 0 THEN 'light'
    WHEN 1 THEN 'dark'
    ELSE 'system'
  END,
  'en'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 3. RACES (1-2 races per user)
-- ============================================================================
INSERT INTO races (
  user_id,
  race_name,
  race_date,
  race_type,
  location,
  priority,
  status,
  swim_distance_km,
  bike_distance_km,
  run_distance_km
)
SELECT 
  u.id,
  CASE (seed_hash(u.id::TEXT, 20) % 4)
    WHEN 0 THEN 'Ironman Lake Placid'
    WHEN 1 THEN 'Ironman Arizona'
    WHEN 2 THEN 'Ironman 70.3 California'
    ELSE 'Ironman 70.3 St. George'
  END as race_name,
  (CURRENT_DATE + INTERVAL '16 weeks' + (seed_hash(u.id::TEXT, 21) % 4 || ' weeks')::INTERVAL)::DATE as race_date,
  CASE (seed_hash(u.id::TEXT, 22) % 5)
    WHEN 0 THEN 'full'
    WHEN 1 THEN 'half'
    WHEN 2 THEN 'olympic'
    WHEN 3 THEN 'sprint'
    ELSE 'full'
  END as race_type,
  CASE (seed_hash(u.id::TEXT, 23) % 4)
    WHEN 0 THEN 'Lake Placid, NY'
    WHEN 1 THEN 'Tempe, AZ'
    WHEN 2 THEN 'Oceanside, CA'
    ELSE 'St. George, UT'
  END as location,
  'A' as priority,
  'upcoming' as status,
  CASE 
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 0 THEN 3.86  -- Full Ironman
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 1 THEN 1.93  -- Half
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 2 THEN 1.5   -- Olympic
    ELSE 0.75  -- Sprint
  END as swim_distance_km,
  CASE 
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 0 THEN 180.25  -- Full
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 1 THEN 90.0    -- Half
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 2 THEN 40.0   -- Olympic
    ELSE 20.0  -- Sprint
  END as bike_distance_km,
  CASE 
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 0 THEN 42.2   -- Full
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 1 THEN 21.1   -- Half
    WHEN (seed_hash(u.id::TEXT, 22) % 5) = 2 THEN 10.0   -- Olympic
    ELSE 5.0  -- Sprint
  END as run_distance_km
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM races WHERE user_id = u.id AND status = 'upcoming'
)
ON CONFLICT DO NOTHING;

-- Add a second race for some users (B priority)
INSERT INTO races (
  user_id,
  race_name,
  race_date,
  race_type,
  location,
  priority,
  status
)
SELECT 
  u.id,
  'Local Sprint Triathlon' as race_name,
  (CURRENT_DATE + INTERVAL '8 weeks')::DATE as race_date,
  'sprint' as race_type,
  'Local' as location,
  'B' as priority,
  'upcoming' as status
FROM auth.users u
WHERE seed_hash(u.id::TEXT, 30) % 2 = 0  -- 50% of users get a second race
  AND NOT EXISTS (
    SELECT 1 FROM races WHERE user_id = u.id AND priority = 'B'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. TRAINING PREFERENCES (linked to primary race)
-- ============================================================================
INSERT INTO training_preferences (
  user_id,
  target_race_id,
  fitness_level,
  target_hours_per_week,
  weekday_time,
  weekend_time,
  start_date,
  end_date,
  is_active
)
SELECT 
  u.id,
  r.id as target_race_id,
  CASE (seed_hash(u.id::TEXT, 40) % 3)
    WHEN 0 THEN 'beginner'
    WHEN 1 THEN 'intermediate'
    ELSE 'advanced'
  END as fitness_level,
  CASE (seed_hash(u.id::TEXT, 40) % 3)
    WHEN 0 THEN 8   -- Beginner
    WHEN 1 THEN 12  -- Intermediate
    ELSE 16         -- Advanced
  END as target_hours_per_week,
  CASE (seed_hash(u.id::TEXT, 41) % 3)
    WHEN 0 THEN '06:00:00'
    WHEN 1 THEN '17:00:00'
    ELSE '18:00:00'
  END::TIME as weekday_time,
  CASE (seed_hash(u.id::TEXT, 42) % 3)
    WHEN 0 THEN '07:00:00'
    WHEN 1 THEN '08:00:00'
    ELSE '09:00:00'
  END::TIME as weekend_time,
  CURRENT_DATE as start_date,
  r.race_date as end_date,
  true as is_active
FROM auth.users u
INNER JOIN races r ON r.user_id = u.id AND r.priority = 'A'
WHERE NOT EXISTS (
  SELECT 1 FROM training_preferences WHERE user_id = u.id AND is_active = true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. EQUIPMENT (bike, shoes, wetsuit)
-- ============================================================================
-- Road bike
INSERT INTO equipment (
  user_id,
  type,
  brand,
  model,
  nickname,
  purchase_date,
  status,
  total_distance_km
)
SELECT 
  u.id,
  'bike' as type,
  CASE (seed_hash(u.id::TEXT, 50) % 4)
    WHEN 0 THEN 'Specialized'
    WHEN 1 THEN 'Trek'
    WHEN 2 THEN 'Cannondale'
    ELSE 'Cervelo'
  END as brand,
  CASE (seed_hash(u.id::TEXT, 50) % 4)
    WHEN 0 THEN 'Tarmac SL7'
    WHEN 1 THEN 'Madone SLR'
    WHEN 2 THEN 'SuperSix EVO'
    ELSE 'P-Series'
  END as model,
  'Road Bike' as nickname,
  (CURRENT_DATE - INTERVAL '2 years' - (seed_hash(u.id::TEXT, 51) % 12 || ' months')::INTERVAL)::DATE as purchase_date,
  'active' as status,
  (500 + seed_hash(u.id::TEXT, 52) * 50)::DECIMAL as total_distance_km
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM equipment WHERE user_id = u.id AND type = 'bike'
)
ON CONFLICT DO NOTHING;

-- Running shoes
INSERT INTO equipment (
  user_id,
  type,
  brand,
  model,
  nickname,
  purchase_date,
  status,
  total_distance_km
)
SELECT 
  u.id,
  'running_shoes' as type,
  CASE (seed_hash(u.id::TEXT, 60) % 4)
    WHEN 0 THEN 'Nike'
    WHEN 1 THEN 'Brooks'
    WHEN 2 THEN 'Hoka'
    ELSE 'Asics'
  END as brand,
  CASE (seed_hash(u.id::TEXT, 60) % 4)
    WHEN 0 THEN 'Pegasus'
    WHEN 1 THEN 'Ghost'
    WHEN 2 THEN 'Clifton'
    ELSE 'Gel-Nimbus'
  END as model,
  'Daily Trainers' as nickname,
  (CURRENT_DATE - INTERVAL '6 months' - (seed_hash(u.id::TEXT, 61) % 3 || ' months')::INTERVAL)::DATE as purchase_date,
  'active' as status,
  (200 + seed_hash(u.id::TEXT, 62) * 20)::DECIMAL as total_distance_km
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM equipment WHERE user_id = u.id AND type = 'running_shoes'
)
ON CONFLICT DO NOTHING;

-- Wetsuit
INSERT INTO equipment (
  user_id,
  type,
  brand,
  model,
  nickname,
  purchase_date,
  status
)
SELECT 
  u.id,
  'wetsuit' as type,
  CASE (seed_hash(u.id::TEXT, 70) % 3)
    WHEN 0 THEN 'Roka'
    WHEN 1 THEN 'Xterra'
    ELSE 'Orca'
  END as brand,
  CASE (seed_hash(u.id::TEXT, 70) % 3)
    WHEN 0 THEN 'Maverick'
    WHEN 1 THEN 'Vector Pro'
    ELSE 'Predator'
  END as model,
  'Wetsuit' as nickname,
  (CURRENT_DATE - INTERVAL '1 year' - (seed_hash(u.id::TEXT, 71) % 6 || ' months')::INTERVAL)::DATE as purchase_date,
  'active' as status
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM equipment WHERE user_id = u.id AND type = 'wetsuit'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. WORKOUTS (2-3 weeks of sample workouts)
-- ============================================================================
-- Generate workouts for the next 2-3 weeks
-- Using a helper function to calculate workout dates
CREATE OR REPLACE FUNCTION generate_workout_date(week_num INTEGER, day_of_week INTEGER)
RETURNS DATE AS $$
DECLARE
  base_date DATE;
  current_dow INTEGER;
BEGIN
  -- Get current day of week (0=Sunday, 1=Monday, etc.)
  current_dow := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
  
  -- Set base date to next Monday (or today if Monday)
  IF current_dow = 1 THEN
    base_date := CURRENT_DATE;
  ELSE
    -- Calculate days until next Monday
    base_date := CURRENT_DATE + (8 - current_dow)::INTEGER;
  END IF;
  
  RETURN base_date + (week_num - 1) * 7 + (day_of_week - 1);
END;
$$ LANGUAGE plpgsql STABLE;

INSERT INTO workouts (
  user_id,
  discipline,
  workout_type,
  duration_minutes,
  scheduled_date,
  scheduled_time,
  description,
  status,
  week_number,
  phase
)
SELECT 
  u.id,
  w.discipline,
  w.workout_type,
  w.duration_minutes,
  generate_workout_date(w.week_num, w.day_of_week) as scheduled_date,
  CASE WHEN w.day_of_week IN (6, 7) THEN tp.weekend_time ELSE tp.weekday_time END as scheduled_time,
  w.description,
  CASE 
    WHEN generate_workout_date(w.week_num, w.day_of_week) < CURRENT_DATE THEN 'completed'
    ELSE 'scheduled'
  END as status,
  w.week_num as week_number,
  CASE 
    WHEN w.week_num <= 4 THEN 'base'
    WHEN w.week_num <= 8 THEN 'build'
    WHEN w.week_num <= 12 THEN 'peak'
    ELSE 'taper'
  END as phase
FROM auth.users u
INNER JOIN training_preferences tp ON tp.user_id = u.id AND tp.is_active = true
CROSS JOIN (
  SELECT 1 as week_num, 'swim' as discipline, 'easy' as workout_type, 45 as duration_minutes, 2 as day_of_week, 'Easy swim - focus on technique' as description
  UNION ALL SELECT 1, 'swim', 'intervals', 60, 4, 'Swim intervals - 8x100m with 30s rest'
  UNION ALL SELECT 1, 'bike', 'easy', 60, 1, 'Easy recovery ride'
  UNION ALL SELECT 1, 'bike', 'tempo', 90, 3, 'Tempo ride - steady effort'
  UNION ALL SELECT 1, 'bike', 'long', 180, 6, 'Long ride - build endurance'
  UNION ALL SELECT 1, 'run', 'easy', 30, 2, 'Easy run - conversational pace'
  UNION ALL SELECT 1, 'run', 'intervals', 45, 4, 'Run intervals - 6x400m with 90s rest'
  UNION ALL SELECT 1, 'run', 'long', 90, 7, 'Long run - aerobic base building'
  UNION ALL SELECT 2, 'swim', 'easy', 45, 2, 'Easy swim - focus on technique'
  UNION ALL SELECT 2, 'swim', 'intervals', 60, 4, 'Swim intervals - 8x100m with 30s rest'
  UNION ALL SELECT 2, 'bike', 'easy', 60, 1, 'Easy recovery ride'
  UNION ALL SELECT 2, 'bike', 'tempo', 90, 3, 'Tempo ride - steady effort'
  UNION ALL SELECT 2, 'bike', 'long', 180, 6, 'Long ride - build endurance'
  UNION ALL SELECT 2, 'run', 'easy', 30, 2, 'Easy run - conversational pace'
  UNION ALL SELECT 2, 'run', 'intervals', 45, 4, 'Run intervals - 6x400m with 90s rest'
  UNION ALL SELECT 2, 'run', 'long', 90, 7, 'Long run - aerobic base building'
  UNION ALL SELECT 3, 'swim', 'easy', 45, 2, 'Easy swim - focus on technique'
  UNION ALL SELECT 3, 'swim', 'intervals', 60, 4, 'Swim intervals - 8x100m with 30s rest'
  UNION ALL SELECT 3, 'bike', 'easy', 60, 1, 'Easy recovery ride'
  UNION ALL SELECT 3, 'bike', 'tempo', 90, 3, 'Tempo ride - steady effort'
  UNION ALL SELECT 3, 'bike', 'long', 180, 6, 'Long ride - build endurance'
  UNION ALL SELECT 3, 'run', 'easy', 30, 2, 'Easy run - conversational pace'
  UNION ALL SELECT 3, 'run', 'intervals', 45, 4, 'Run intervals - 6x400m with 90s rest'
  UNION ALL SELECT 3, 'run', 'long', 90, 7, 'Long run - aerobic base building'
) w
WHERE generate_workout_date(w.week_num, w.day_of_week) >= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM workouts w2
    WHERE w2.user_id = u.id
      AND w2.scheduled_date = generate_workout_date(w.week_num, w.day_of_week)
      AND w2.discipline = w.discipline
  )
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS generate_workout_date(INTEGER, INTEGER);

-- ============================================================================
-- 7. WORKOUT LOGS (for completed workouts)
-- ============================================================================
INSERT INTO workout_logs (
  workout_id,
  user_id,
  completed_at,
  distance_km,
  duration_seconds,
  avg_pace_min_per_km,
  avg_heart_rate,
  rpe,
  feeling
)
SELECT 
  w.id,
  w.user_id,
  w.completed_at,
  CASE w.discipline
    WHEN 'swim' THEN (w.duration_minutes * 0.025)::DECIMAL(6,2)  -- ~25m/min pace
    WHEN 'bike' THEN (w.duration_minutes * 0.3)::DECIMAL(6,2)     -- ~30km/h avg
    WHEN 'run' THEN (w.duration_minutes * 0.15)::DECIMAL(6,2)    -- ~6min/km pace
  END as distance_km,
  w.duration_minutes * 60 as duration_seconds,
  CASE w.discipline
    WHEN 'run' THEN (w.duration_minutes / (w.duration_minutes * 0.15))::DECIMAL(5,2)
    ELSE NULL
  END as avg_pace_min_per_km,
  140 + seed_hash(w.user_id::TEXT || w.id::TEXT, 200) % 30 as avg_heart_rate,
  5 + seed_hash(w.user_id::TEXT || w.id::TEXT, 201) % 4 as rpe,
  CASE (seed_hash(w.user_id::TEXT || w.id::TEXT, 202) % 5)
    WHEN 0 THEN 'terrible'
    WHEN 1 THEN 'poor'
    WHEN 2 THEN 'ok'
    WHEN 3 THEN 'good'
    ELSE 'great'
  END as feeling
FROM workouts w
WHERE w.status = 'completed'
  AND w.completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workout_logs WHERE workout_id = w.id
  )
ON CONFLICT (workout_id) DO NOTHING;

-- ============================================================================
-- 8. BODY METRICS (recent entries)
-- ============================================================================
INSERT INTO body_metrics (
  user_id,
  recorded_at,
  weight_kg,
  resting_heart_rate,
  sleep_hours,
  sleep_quality,
  fatigue_level,
  stress_level
)
SELECT 
  u.id,
  (CURRENT_DATE - (day_offset || ' days')::INTERVAL)::TIMESTAMPTZ as recorded_at,
  (70 + seed_hash(u.id::TEXT, 300) % 15 - 5)::DECIMAL(5,2) as weight_kg,
  50 + seed_hash(u.id::TEXT || day_offset::TEXT, 301) % 15 as resting_heart_rate,
  (7.0 + (seed_hash(u.id::TEXT || day_offset::TEXT, 302) % 3) * 0.5)::DECIMAL(3,1) as sleep_hours,
  5 + seed_hash(u.id::TEXT || day_offset::TEXT, 303) % 4 as sleep_quality,
  3 + seed_hash(u.id::TEXT || day_offset::TEXT, 304) % 5 as fatigue_level,
  3 + seed_hash(u.id::TEXT || day_offset::TEXT, 305) % 5 as stress_level
FROM auth.users u
CROSS JOIN generate_series(0, 6) as day_offset
WHERE NOT EXISTS (
  SELECT 1 FROM body_metrics bm 
  WHERE bm.user_id = u.id 
    AND bm.recorded_at::DATE = (CURRENT_DATE - day_offset)::DATE
)
ON CONFLICT (user_id, recorded_at) DO NOTHING;

-- ============================================================================
-- 9. TRAINING ZONES (HR zones for each discipline)
-- ============================================================================
INSERT INTO training_zones (
  user_id,
  discipline,
  zone_type,
  zone1_min, zone1_max,
  zone2_min, zone2_max,
  zone3_min, zone3_max,
  zone4_min, zone4_max,
  zone5_min, zone5_max,
  valid_from,
  is_active
)
SELECT 
  u.id,
  discipline,
  'heart_rate' as zone_type,
  -- Zone 1: 50-60% of max HR (assuming max HR = 220 - age)
  (max_hr * 0.50)::DECIMAL(6,2) as zone1_min,
  (max_hr * 0.60)::DECIMAL(6,2) as zone1_max,
  -- Zone 2: 60-70%
  (max_hr * 0.60)::DECIMAL(6,2) as zone2_min,
  (max_hr * 0.70)::DECIMAL(6,2) as zone2_max,
  -- Zone 3: 70-80%
  (max_hr * 0.70)::DECIMAL(6,2) as zone3_min,
  (max_hr * 0.80)::DECIMAL(6,2) as zone3_max,
  -- Zone 4: 80-90%
  (max_hr * 0.80)::DECIMAL(6,2) as zone4_min,
  (max_hr * 0.90)::DECIMAL(6,2) as zone4_max,
  -- Zone 5: 90-100%
  (max_hr * 0.90)::DECIMAL(6,2) as zone5_min,
  (max_hr * 1.00)::DECIMAL(6,2) as zone5_max,
  CURRENT_DATE as valid_from,
  true as is_active
FROM auth.users u
CROSS JOIN (VALUES ('swim'), ('bike'), ('run')) as disciplines(discipline)
CROSS JOIN LATERAL (
  SELECT (220 - EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(up.date_of_birth, CURRENT_DATE - INTERVAL '30 years'))))::INTEGER as max_hr
  FROM user_profiles up
  WHERE up.id = u.id
  LIMIT 1
) hr_calc
WHERE NOT EXISTS (
  SELECT 1 FROM training_zones tz
  WHERE tz.user_id = u.id
    AND tz.discipline = disciplines.discipline
    AND tz.zone_type = 'heart_rate'
    AND tz.is_active = true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. PERSONAL RECORDS (sample PRs)
-- ============================================================================
INSERT INTO personal_records (
  user_id,
  discipline,
  distance_km,
  time_seconds,
  avg_pace_min_per_km,
  achieved_at,
  location
)
SELECT 
  u.id,
  discipline,
  distance_km,
  time_seconds,
  (time_seconds / 60.0 / distance_km)::DECIMAL(5,2) as avg_pace_min_per_km,
  (CURRENT_DATE - INTERVAL '6 months' - (seed_hash(u.id::TEXT || discipline, 400) % 180 || ' days')::INTERVAL)::TIMESTAMPTZ as achieved_at,
  CASE (seed_hash(u.id::TEXT || discipline, 401) % 3)
    WHEN 0 THEN 'Local Race'
    WHEN 1 THEN 'Training Time Trial'
    ELSE 'Group Ride/Run'
  END as location
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('swim', 0.75, 1200),   -- 750m in 20:00
    ('swim', 1.5, 2400),     -- 1500m in 40:00
    ('bike', 40.0, 3600),   -- 40km in 1:00:00
    ('bike', 90.0, 10800),  -- 90km in 3:00:00
    ('run', 5.0, 1800),     -- 5km in 30:00
    ('run', 10.0, 3600),    -- 10km in 1:00:00
    ('run', 21.1, 5400)     -- Half marathon in 1:30:00
) as pr_template(discipline, distance_km, time_seconds)
WHERE seed_hash(u.id::TEXT || pr_template.discipline, 402) % 2 = 0  -- 50% chance per PR
  AND NOT EXISTS (
    SELECT 1 FROM personal_records pr
    WHERE pr.user_id = u.id
      AND pr.discipline = pr_template.discipline
      AND ABS(pr.distance_km - pr_template.distance_km) < 0.1
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CLEANUP: Drop helper function
-- ============================================================================
DROP FUNCTION IF EXISTS seed_hash(TEXT, INTEGER);
