# Schema Comparison: Before vs After

## Summary of Changes

| Category | Before | After | Status |
|----------|--------|-------|--------|
| **Tables** | 2 tables | 11 tables | ✅ Expanded |
| **User Data** | Mixed in `profiles` | Separated into 3 tables | ✅ Improved |
| **Races** | Single `race_date` field | Full `races` table | ✅ Added |
| **Training Preferences** | In `profiles` | Separate `training_preferences` | ✅ Separated |
| **Performance Tracking** | None | `workout_logs` table | ✅ Added |
| **Equipment Tracking** | None | `equipment` table | ✅ Added |
| **Body Metrics** | None | `body_metrics` table | ✅ Added |
| **Training Zones** | None | `training_zones` table | ✅ Added |
| **Personal Records** | None | `personal_records` table | ✅ Added |
| **Integrations** | Google only in `profiles` | Multi-provider `integrations` | ✅ Enhanced |

---

## Table-by-Table Comparison

### 🔴 OLD SCHEMA (2 tables)

#### 1. `profiles` Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  race_date DATE NOT NULL,              -- ❌ Single race only
  fitness_level VARCHAR(20) NOT NULL,    -- ❌ Mixed with user data
  target_hours_per_week INTEGER,         -- ❌ Mixed with user data
  weekday_time TIME NOT NULL,            -- ❌ Mixed with user data
  weekend_time TIME NOT NULL,            -- ❌ Mixed with user data
  timezone VARCHAR(50),                  -- ✅ Good
  google_calendar_id VARCHAR(255),       -- ❌ Only Google, mixed with profile
  google_access_token TEXT,              -- ❌ Security concern in user table
  google_refresh_token TEXT,             -- ❌ Security concern in user table
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Problems:**
- ❌ No personal info (name, avatar, bio, etc.)
- ❌ Training preferences mixed with identity
- ❌ Only one race date - can't train for multiple races
- ❌ Calendar tokens stored insecurely
- ❌ No app settings (units, notifications, theme)
- ❌ No way to track historical training preferences

#### 2. `workouts` Table
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  discipline VARCHAR(10),
  workout_type VARCHAR(20),
  duration_minutes INTEGER,
  scheduled_date DATE,
  scheduled_time TIME,
  description TEXT,
  status VARCHAR(20),                    -- ✅ Good
  completed_at TIMESTAMPTZ,              -- ⚠️  Only timestamp, no metrics
  google_event_id VARCHAR(255),          -- ❌ Should be in integrations
  week_number INTEGER,
  phase VARCHAR(10),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Problems:**
- ❌ No actual performance data (HR, power, pace, distance)
- ❌ No way to track what equipment was used
- ❌ No athlete feedback or notes
- ❌ Can't compare planned vs actual
- ❌ No integration with external services (Strava, Garmin)

---

### 🟢 NEW SCHEMA (11 tables)

#### 1. `user_profiles` - Personal Information
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255),                -- ✅ NEW
  display_name VARCHAR(100),             -- ✅ NEW
  avatar_url TEXT,                       -- ✅ NEW
  bio TEXT,                              -- ✅ NEW
  date_of_birth DATE,                    -- ✅ NEW
  gender VARCHAR(20),                    -- ✅ NEW
  location VARCHAR(255),                 -- ✅ NEW
  timezone VARCHAR(50),                  -- ✅ Kept
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Benefits:**
- ✅ Separate user identity from training data
- ✅ Profile picture support
- ✅ Demographic data for analytics

---

#### 2. `user_settings` - App Preferences
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  distance_unit VARCHAR(10),             -- ✅ NEW: km/mi
  weight_unit VARCHAR(10),               -- ✅ NEW: kg/lbs
  temperature_unit VARCHAR(10),          -- ✅ NEW: celsius/fahrenheit
  email_notifications BOOLEAN,           -- ✅ NEW
  push_notifications BOOLEAN,            -- ✅ NEW
  workout_reminders BOOLEAN,             -- ✅ NEW
  reminder_minutes_before INTEGER,       -- ✅ NEW
  theme VARCHAR(20),                     -- ✅ NEW: light/dark/system
  language VARCHAR(10),                  -- ✅ NEW
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Benefits:**
- ✅ User-specific app preferences
- ✅ Internationalization support
- ✅ Notification controls

---

#### 3. `races` - Target Races
```sql
CREATE TABLE races (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  race_name VARCHAR(255),                -- ✅ NEW
  race_date DATE,                        -- ✅ From old profiles
  race_type VARCHAR(50),                 -- ✅ NEW: sprint/olympic/half/full
  location VARCHAR(255),                 -- ✅ NEW
  priority CHAR(1),                      -- ✅ NEW: A/B/C races
  status VARCHAR(20),                    -- ✅ NEW: upcoming/completed/dns/dnf
  swim_distance_km DECIMAL(5,2),         -- ✅ NEW
  bike_distance_km DECIMAL(6,2),         -- ✅ NEW
  run_distance_km DECIMAL(5,2),          -- ✅ NEW
  -- Results (filled after race)
  total_time_seconds INTEGER,            -- ✅ NEW
  swim_time_seconds INTEGER,             -- ✅ NEW
  t1_time_seconds INTEGER,               -- ✅ NEW
  bike_time_seconds INTEGER,             -- ✅ NEW
  t2_time_seconds INTEGER,               -- ✅ NEW
  run_time_seconds INTEGER,              -- ✅ NEW
  overall_place INTEGER,                 -- ✅ NEW
  division_place INTEGER,                -- ✅ NEW
  notes TEXT,                            -- ✅ NEW
  race_report TEXT,                      -- ✅ NEW
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Benefits:**
- ✅ Multiple races (can have A, B, C priority races)
- ✅ Store race results with splits
- ✅ Track race history
- ✅ Write race reports

---

#### 4. `training_preferences` - Training Configuration
```sql
CREATE TABLE training_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  target_race_id UUID,                   -- ✅ NEW: Link to specific race
  fitness_level VARCHAR(20),             -- ✅ From old profiles
  target_hours_per_week INTEGER,         -- ✅ From old profiles
  weekday_time TIME,                     -- ✅ From old profiles
  weekend_time TIME,                     -- ✅ From old profiles
  start_date DATE,                       -- ✅ NEW
  end_date DATE,                         -- ✅ NEW
  is_active BOOLEAN,                     -- ✅ NEW: Track current vs historical
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Only one active preference per user
  CONSTRAINT unique_active_preference
    EXCLUDE (user_id WITH =) WHERE (is_active = true)
);
```

**Benefits:**
- ✅ Linked to specific races
- ✅ Historical tracking of preferences
- ✅ Can change preferences for different training cycles

---

#### 5. `workouts` - Planned Workouts (Updated)
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  discipline VARCHAR(10),
  workout_type VARCHAR(20),
  duration_minutes INTEGER,
  scheduled_date DATE,
  scheduled_time TIME,
  description TEXT,
  status VARCHAR(20),
  completed_at TIMESTAMPTZ,
  week_number INTEGER,
  phase VARCHAR(10),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
  -- ❌ Removed: google_event_id (moved to integrations)
);
```

**Changes:**
- ✅ Kept as planned workout table
- ✅ Removed Google-specific fields

---

#### 6. `workout_logs` - Actual Performance
```sql
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY,
  workout_id UUID NOT NULL,              -- ✅ Links to planned workout
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ,
  -- Performance metrics
  distance_km DECIMAL(6,2),              -- ✅ NEW
  duration_seconds INTEGER,              -- ✅ NEW
  avg_pace_min_per_km DECIMAL(5,2),      -- ✅ NEW
  avg_speed_kph DECIMAL(5,2),            -- ✅ NEW
  avg_heart_rate INTEGER,                -- ✅ NEW
  max_heart_rate INTEGER,                -- ✅ NEW
  avg_power_watts INTEGER,               -- ✅ NEW (cycling)
  normalized_power_watts INTEGER,        -- ✅ NEW (cycling)
  rpe INTEGER,                           -- ✅ NEW: Rate of perceived exertion
  -- Environmental
  temperature_celsius DECIMAL(4,1),      -- ✅ NEW
  weather_conditions VARCHAR(50),        -- ✅ NEW
  -- Equipment & feedback
  equipment_id UUID,                     -- ✅ NEW: Track gear used
  athlete_notes TEXT,                    -- ✅ NEW
  feeling VARCHAR(20),                   -- ✅ NEW: terrible/poor/ok/good/great
  -- Integration
  data_source VARCHAR(50),               -- ✅ NEW: manual/strava/garmin
  external_id VARCHAR(255),              -- ✅ NEW
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(workout_id)                     -- ✅ One log per workout
);
```

**Benefits:**
- ✅ Track actual vs planned performance
- ✅ Heart rate and power data
- ✅ Integration with Strava/Garmin
- ✅ Athlete feedback and notes
- ✅ Environmental conditions

---

#### 7. `equipment` - Gear Tracking
```sql
CREATE TABLE equipment (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50),                      -- ✅ NEW: bike/shoes/wetsuit/etc.
  brand VARCHAR(100),                    -- ✅ NEW
  model VARCHAR(100),                    -- ✅ NEW
  nickname VARCHAR(100),                 -- ✅ NEW
  purchase_date DATE,                    -- ✅ NEW
  purchase_price DECIMAL(10,2),          -- ✅ NEW
  retirement_date DATE,                  -- ✅ NEW
  status VARCHAR(20),                    -- ✅ NEW: active/retired/maintenance
  total_distance_km DECIMAL(8,2),        -- ✅ NEW: Auto-updated
  total_duration_hours DECIMAL(8,2),     -- ✅ NEW: Auto-updated
  last_maintenance_date DATE,            -- ✅ NEW
  next_maintenance_date DATE,            -- ✅ NEW
  maintenance_notes TEXT,                -- ✅ NEW
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Benefits:**
- ✅ Track when to replace running shoes (based on mileage)
- ✅ Bike maintenance schedules
- ✅ Equipment lifecycle management
- ✅ Cost tracking

---

#### 8. `body_metrics` - Health Tracking
```sql
CREATE TABLE body_metrics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ,
  -- Body composition
  weight_kg DECIMAL(5,2),                -- ✅ NEW
  body_fat_percentage DECIMAL(4,2),      -- ✅ NEW
  muscle_mass_kg DECIMAL(5,2),           -- ✅ NEW
  -- Cardiovascular
  resting_heart_rate INTEGER,            -- ✅ NEW
  hrv_score INTEGER,                     -- ✅ NEW: Heart rate variability
  -- Recovery
  sleep_hours DECIMAL(3,1),              -- ✅ NEW
  sleep_quality INTEGER,                 -- ✅ NEW: 1-10 scale
  fatigue_level INTEGER,                 -- ✅ NEW: 1-10 scale
  stress_level INTEGER,                  -- ✅ NEW: 1-10 scale
  notes TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, recorded_at)
);
```

**Benefits:**
- ✅ Track fitness trends over time
- ✅ Monitor recovery (HRV, sleep)
- ✅ Weight and body composition
- ✅ Correlate with training load

---

#### 9. `training_zones` - HR/Power/Pace Zones
```sql
CREATE TABLE training_zones (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  discipline VARCHAR(10),                -- ✅ NEW: swim/bike/run
  zone_type VARCHAR(20),                 -- ✅ NEW: heart_rate/power/pace
  -- 5 zones
  zone1_min DECIMAL(6,2),                -- ✅ NEW
  zone1_max DECIMAL(6,2),                -- ✅ NEW
  zone2_min DECIMAL(6,2),                -- ✅ NEW
  zone2_max DECIMAL(6,2),                -- ✅ NEW
  zone3_min DECIMAL(6,2),                -- ✅ NEW
  zone3_max DECIMAL(6,2),                -- ✅ NEW
  zone4_min DECIMAL(6,2),                -- ✅ NEW
  zone4_max DECIMAL(6,2),                -- ✅ NEW
  zone5_min DECIMAL(6,2),                -- ✅ NEW
  zone5_max DECIMAL(6,2),                -- ✅ NEW
  valid_from DATE,                       -- ✅ NEW
  valid_to DATE,                         -- ✅ NEW
  is_active BOOLEAN,                     -- ✅ NEW
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  CONSTRAINT unique_active_zone
    EXCLUDE (user_id WITH =, discipline WITH =, zone_type WITH =)
    WHERE (is_active = true)
);
```

**Benefits:**
- ✅ Define proper training zones
- ✅ Update zones after FTP/threshold tests
- ✅ Historical tracking of zone changes
- ✅ Per-discipline zones

---

#### 10. `personal_records` - PRs
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  discipline VARCHAR(10),                -- ✅ NEW
  distance_km DECIMAL(6,2),              -- ✅ NEW
  time_seconds INTEGER,                  -- ✅ NEW
  avg_pace_min_per_km DECIMAL(5,2),      -- ✅ NEW
  avg_speed_kph DECIMAL(5,2),            -- ✅ NEW
  achieved_at TIMESTAMPTZ,               -- ✅ NEW
  race_id UUID,                          -- ✅ NEW: Link to race if from race
  location VARCHAR(255),                 -- ✅ NEW
  workout_log_id UUID,                   -- ✅ NEW: Link to workout log
  external_id VARCHAR(255),              -- ✅ NEW: Strava/Garmin ID
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Benefits:**
- ✅ Celebrate achievements
- ✅ Track progress over time
- ✅ Motivational tool

---

#### 11. `integrations` - External Services
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  provider VARCHAR(50),                  -- ✅ NEW: Multi-provider support
  provider_user_id VARCHAR(255),         -- ✅ NEW
  -- OAuth tokens
  access_token TEXT,                     -- ✅ From old profiles
  refresh_token TEXT,                    -- ✅ From old profiles
  token_expires_at TIMESTAMPTZ,          -- ✅ NEW
  -- Provider-specific
  calendar_id VARCHAR(255),              -- ✅ From old profiles
  sync_settings JSONB,                   -- ✅ NEW: Flexible config
  -- Status
  is_active BOOLEAN,                     -- ✅ NEW
  last_sync_at TIMESTAMPTZ,              -- ✅ NEW
  last_sync_status VARCHAR(50),          -- ✅ NEW
  last_sync_error TEXT,                  -- ✅ NEW
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);
```

**Benefits:**
- ✅ Support multiple providers (Google, Strava, Garmin, TrainingPeaks, Whoop)
- ✅ Better token management
- ✅ Sync status tracking
- ✅ Flexible provider-specific settings (JSONB)

---

## Migration Path

### Old Flow
```
User signs up
    ↓
Create profile (mixes everything)
    ↓
Create workouts
    ↓
Mark workouts as completed (no metrics)
```

### New Flow
```
User signs up
    ↓
Create user_profile (personal info)
    ↓
Create user_settings (preferences)
    ↓
Create race (target event)
    ↓
Create training_preferences (linked to race)
    ↓
Create workouts (planned)
    ↓
Complete workout → Create workout_log (actual metrics)
    ↓
Track body_metrics, equipment, PRs
```

---

## Data Migration Required

If you have existing users, you'll need to:

1. **Migrate `profiles` → `user_profiles`** (timezone only)
2. **Migrate `profiles` → `training_preferences`** (training config)
3. **Migrate `profiles.google_*` → `integrations`** (Google Calendar)
4. **Create `races`** from `profiles.race_date`
5. **Create default `user_settings`** for all users

See `SCHEMA_REFACTOR.md` for detailed migration SQL.

---

## Conclusion

### Before: 2 Tables
- ❌ Mixed concerns
- ❌ Limited functionality
- ❌ No performance tracking
- ❌ No equipment/health tracking

### After: 11 Tables
- ✅ Proper separation of concerns
- ✅ Comprehensive training tracking
- ✅ Performance analytics
- ✅ Equipment lifecycle management
- ✅ Health metrics over time
- ✅ Multiple race support
- ✅ Multi-provider integrations
- ✅ Historical data tracking

**The new schema is production-ready for a serious Ironman training application!** 🏊‍♂️🚴‍♂️🏃‍♂️
