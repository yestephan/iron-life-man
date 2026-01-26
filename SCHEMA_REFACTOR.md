# Database Schema Refactor Documentation

## Overview

This document describes the comprehensive database schema refactor for the Iron Life Man application, separating concerns and adding missing critical entities for proper training tracking.

## What Changed

### ❌ Removed Tables
- `profiles` - This table mixed too many concerns (user info + training preferences + calendar integrations)

### ✅ New Tables

#### 1. **user_profiles** - Personal Information
Stores user identity and personal information (separate from training data).

**Fields:**
- `id` → references `auth.users(id)`
- `full_name`, `display_name`, `avatar_url`, `bio`
- `date_of_birth`, `gender`, `location`
- `timezone` (moved from old profiles table)

#### 2. **user_settings** - App Preferences
User-specific application settings and preferences.

**Fields:**
- `distance_unit`, `weight_unit`, `temperature_unit`
- `email_notifications`, `push_notifications`, `workout_reminders`
- `reminder_minutes_before`
- `theme`, `language`

#### 3. **races** - Target Races
Users can have multiple target races (A, B, C priorities).

**Fields:**
- `race_name`, `race_date`, `race_type` (sprint/olympic/half/full)
- `location`, `priority` (A/B/C), `status`
- Distance fields: `swim_distance_km`, `bike_distance_km`, `run_distance_km`
- Results: `total_time_seconds`, split times, placement
- `notes`, `race_report`

#### 4. **training_preferences** - Training Configuration
Separated from user profile, can be linked to specific races.

**Fields:**
- `target_race_id` → references `races(id)`
- `fitness_level`, `target_hours_per_week`
- `weekday_time`, `weekend_time`
- `start_date`, `end_date`, `is_active`
- **Constraint:** Only one active preference per user

**Key Benefit:** Users can have historical training preferences and switch between different training cycles.

#### 5. **workouts** - Planned Workouts
Kept as-is, with minor changes:
- Removed `google_event_id` (moved to integrations)
- Removed `google_calendar_id` references

#### 6. **workout_logs** - Actual Performance Data
NEW! Tracks what actually happened during workouts vs what was planned.

**Fields:**
- `workout_id` → references `workouts(id)`
- Performance: `distance_km`, `duration_seconds`, `avg_pace_min_per_km`, `avg_speed_kph`
- Heart rate: `avg_heart_rate`, `max_heart_rate`
- Power (cycling): `avg_power_watts`, `normalized_power_watts`
- Subjective: `rpe` (1-10), `feeling` (terrible/poor/ok/good/great)
- Environmental: `temperature_celsius`, `weather_conditions`
- `equipment_id`, `athlete_notes`
- `data_source`, `external_id` (for Strava/Garmin integration)
- **Constraint:** One log per workout

**Key Benefit:** Compare planned vs actual performance, track real metrics.

#### 7. **equipment** - Gear Tracking
Track bikes, running shoes, wetsuits, and their usage/maintenance.

**Fields:**
- `type`, `brand`, `model`, `nickname`
- `purchase_date`, `purchase_price`, `retirement_date`
- `status` (active/retired/maintenance/sold)
- Usage: `total_distance_km`, `total_duration_hours`
- Maintenance: `last_maintenance_date`, `next_maintenance_date`, `maintenance_notes`

**Key Benefit:** Track when to replace running shoes, bike maintenance schedules.

#### 8. **body_metrics** - Health Tracking Over Time
Track weight, body composition, recovery metrics over time.

**Fields:**
- `recorded_at`
- Body: `weight_kg`, `body_fat_percentage`, `muscle_mass_kg`
- Cardiovascular: `resting_heart_rate`, `hrv_score`
- Recovery: `sleep_hours`, `sleep_quality`, `fatigue_level`, `stress_level`
- **Constraint:** One entry per user per timestamp

**Key Benefit:** Track trends in fitness, weight, recovery.

#### 9. **training_zones** - HR/Power/Pace Zones
Define training zones for each discipline.

**Fields:**
- `discipline` (swim/bike/run)
- `zone_type` (heart_rate/power/pace)
- `zone1_min`, `zone1_max`, ... `zone5_min`, `zone5_max`
- `valid_from`, `valid_to`, `is_active`
- **Constraint:** One active zone set per user/discipline/type

**Key Benefit:** Train in the right zones, track when zones change after fitness tests.

#### 10. **personal_records** - PRs
Track personal best times for different distances.

**Fields:**
- `discipline`, `distance_km`
- `time_seconds`, `avg_pace_min_per_km`, `avg_speed_kph`
- `achieved_at`, `race_id`, `location`
- `workout_log_id`, `external_id`

**Key Benefit:** Celebrate achievements, track progress.

#### 11. **integrations** - External Service Connections
Moved from old profiles table, supports multiple integrations.

**Fields:**
- `provider` (google_calendar/strava/garmin/trainingpeaks/whoop)
- `provider_user_id`
- OAuth: `access_token`, `refresh_token`, `token_expires_at`
- `calendar_id`, `sync_settings` (JSONB)
- Status: `is_active`, `last_sync_at`, `last_sync_status`, `last_sync_error`
- **Constraint:** One integration per user per provider

**Key Benefit:** Support multiple integrations, not just Google Calendar.

---

## Migration Strategy

### Phase 1: Data Migration from Old `profiles` Table

If you have existing data in the old `profiles` table, you'll need to migrate it:

```sql
-- 1. Migrate to user_profiles
INSERT INTO user_profiles (id, timezone, created_at, updated_at)
SELECT id, timezone, created_at, updated_at
FROM profiles;

-- 2. Migrate to training_preferences
INSERT INTO training_preferences (
  user_id,
  fitness_level,
  target_hours_per_week,
  weekday_time,
  weekend_time,
  start_date,
  is_active
)
SELECT
  id,
  fitness_level,
  target_hours_per_week,
  weekday_time,
  weekend_time,
  created_at::date,
  true
FROM profiles;

-- 3. Migrate Google Calendar integration
INSERT INTO integrations (
  user_id,
  provider,
  calendar_id,
  access_token,
  refresh_token,
  is_active
)
SELECT
  id,
  'google_calendar',
  google_calendar_id,
  google_access_token,
  google_refresh_token,
  true
FROM profiles
WHERE google_calendar_id IS NOT NULL;

-- 4. Create race entries from old race_date
INSERT INTO races (
  user_id,
  race_name,
  race_date,
  race_type,
  priority,
  status
)
SELECT
  id,
  'My Target Race', -- You'll need to update this manually
  race_date,
  'full', -- Assuming Ironman, adjust as needed
  'A',
  CASE
    WHEN race_date < CURRENT_DATE THEN 'completed'
    ELSE 'upcoming'
  END
FROM profiles;

-- 5. Link training preferences to races
UPDATE training_preferences tp
SET target_race_id = r.id
FROM races r
WHERE tp.user_id = r.user_id;

-- 6. Drop old profiles table (BE CAREFUL!)
-- DROP TABLE profiles;
```

### Phase 2: Update Application Code

You'll need to update the following files:

#### 1. **lib/supabase/queries.ts**
- Remove `getProfile`, `createProfile`, `updateProfile` functions
- Add new query functions for all new tables
- Update workout queries to work with new structure

#### 2. **app/onboarding/** pages
- Update race-info page to create a `race` record first
- Update availability page to create `training_preferences` linked to race
- Update generating page to create `user_profiles` and `user_settings`

#### 3. **app/dashboard/** pages
- Update to fetch from `training_preferences` instead of `profiles`
- Add UI for logging actual workout performance (workout_logs)
- Add UI for tracking body metrics

#### 4. **components/**
- Update all components that reference the old `Profile` type
- Add new components for:
  - Equipment management
  - Body metrics tracking
  - Personal records display
  - Race management

---

## Key Architectural Changes

### 1. **Separation of Concerns**
- **Before:** User info, training preferences, and integrations all mixed in `profiles`
- **After:** Clean separation into `user_profiles`, `training_preferences`, `integrations`

### 2. **Multiple Races Support**
- **Before:** One `race_date` field
- **After:** Multiple races with priorities (A/B/C), allowing users to train for multiple events

### 3. **Historical Training Plans**
- **Before:** Only current preferences
- **After:** Keep history of training preferences with `is_active` flag

### 4. **Actual vs Planned**
- **Before:** Only planned workouts in `workouts` table
- **After:**
  - `workouts` = planned
  - `workout_logs` = actual execution with performance data

### 5. **Equipment Lifecycle**
- **Before:** No equipment tracking
- **After:** Track all gear with usage and maintenance

### 6. **Comprehensive Performance Tracking**
- **Before:** Just workout completion status
- **After:**
  - Detailed performance metrics (HR, power, pace)
  - Body metrics over time
  - Training zones
  - Personal records

---

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    │
    ├─→ user_profiles (1:1) - Personal info
    ├─→ user_settings (1:1) - App preferences
    │
    ├─→ races (1:N) - Target races
    │       │
    │       └─→ training_preferences (1:N) - Training configs
    │
    ├─→ workouts (1:N) - Planned workouts
    │       │
    │       └─→ workout_logs (1:1) - Actual performance
    │               │
    │               └─→ equipment (N:1) - Gear used
    │
    ├─→ equipment (1:N) - Bikes, shoes, etc.
    ├─→ body_metrics (1:N) - Weight, HR, HRV over time
    ├─→ training_zones (1:N) - HR/Power/Pace zones
    ├─→ personal_records (1:N) - PRs
    └─→ integrations (1:N) - External services
```

---

## Row Level Security (RLS)

All tables have RLS enabled with the same pattern:
- Users can only read/insert/update/delete **their own** data
- Uses `auth.uid()` to enforce user isolation
- No cross-user data access possible

---

## Indexes

Optimized indexes for common query patterns:
- User + date combinations (workouts, logs, metrics)
- User + status filters
- Active flags for current preferences/zones
- External ID lookups for integrations

---

## Next Steps

1. ✅ **Schema created** - New comprehensive schema in `001_schema.sql`
2. ✅ **Types updated** - TypeScript types in `types/database.ts`
3. ⏳ **Run migration** - Apply the new schema to your Supabase database
4. ⏳ **Update queries.ts** - Add query functions for all new tables
5. ⏳ **Update onboarding** - Modify to use new schema structure
6. ⏳ **Update dashboard** - Add new features (workout logging, metrics, etc.)
7. ⏳ **Add new features** - Equipment tracking, body metrics, PRs, etc.

---

## Questions?

If you need help with any part of this migration, let me know! The schema is now production-ready and follows best practices for:
- Data normalization
- Single responsibility principle
- Historical tracking
- Performance optimization
- Security (RLS)
