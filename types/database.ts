// Database type definitions

// ============================================================================
// ENUMS
// ============================================================================

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Discipline = 'swim' | 'bike' | 'run';
export type WorkoutType = 'easy' | 'tempo' | 'intervals' | 'long';
export type WorkoutStatus = 'scheduled' | 'completed' | 'skipped';
export type Phase = 'base' | 'build' | 'peak' | 'taper';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type RaceType = 'sprint' | 'olympic' | 'half' | 'full' | 'other';
export type RacePriority = 'A' | 'B' | 'C';
export type RaceStatus = 'upcoming' | 'completed' | 'cancelled' | 'dns' | 'dnf';
export type EquipmentType = 'bike' | 'running_shoes' | 'wetsuit' | 'goggles' | 'helmet' | 'other';
export type EquipmentStatus = 'active' | 'retired' | 'maintenance' | 'sold';
export type Feeling = 'terrible' | 'poor' | 'ok' | 'good' | 'great';
export type DistanceUnit = 'km' | 'mi';
export type WeightUnit = 'kg' | 'lbs';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type Theme = 'light' | 'dark' | 'system';
export type ZoneType = 'heart_rate' | 'power' | 'pace';
export type IntegrationProvider = 'google_calendar' | 'strava' | 'garmin' | 'trainingpeaks' | 'whoop' | 'other';
export type SyncStatus = 'connected' | 'disconnected' | 'error' | 'needs_reconnection';

// ============================================================================
// USER PROFILES
// ============================================================================

export interface UserProfile {
  id: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  date_of_birth?: Date;
  gender?: Gender;
  location?: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfileRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  location: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export interface UserSettings {
  id: string;
  user_id: string;
  distance_unit: DistanceUnit;
  weight_unit: WeightUnit;
  temperature_unit: TemperatureUnit;
  email_notifications: boolean;
  push_notifications: boolean;
  workout_reminders: boolean;
  reminder_minutes_before: number;
  theme: Theme;
  language: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSettingsRow {
  id: string;
  user_id: string;
  distance_unit: DistanceUnit;
  weight_unit: WeightUnit;
  temperature_unit: TemperatureUnit;
  email_notifications: boolean;
  push_notifications: boolean;
  workout_reminders: boolean;
  reminder_minutes_before: number;
  theme: Theme;
  language: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RACES
// ============================================================================

export interface Race {
  id: string;
  user_id: string;
  race_name: string;
  race_date: Date;
  race_type: RaceType;
  location?: string;
  priority?: RacePriority;
  status: RaceStatus;
  swim_distance_km?: number;
  bike_distance_km?: number;
  run_distance_km?: number;
  total_time_seconds?: number;
  swim_time_seconds?: number;
  t1_time_seconds?: number;
  bike_time_seconds?: number;
  t2_time_seconds?: number;
  run_time_seconds?: number;
  overall_place?: number;
  division_place?: number;
  notes?: string;
  race_report?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RaceRow {
  id: string;
  user_id: string;
  race_name: string;
  race_date: string;
  race_type: RaceType;
  location: string | null;
  priority: RacePriority | null;
  status: RaceStatus;
  swim_distance_km: number | null;
  bike_distance_km: number | null;
  run_distance_km: number | null;
  total_time_seconds: number | null;
  swim_time_seconds: number | null;
  t1_time_seconds: number | null;
  bike_time_seconds: number | null;
  t2_time_seconds: number | null;
  run_time_seconds: number | null;
  overall_place: number | null;
  division_place: number | null;
  notes: string | null;
  race_report: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRAINING PREFERENCES
// ============================================================================

export interface TrainingPreference {
  id: string;
  user_id: string;
  target_race_id?: string;
  fitness_level: FitnessLevel;
  target_hours_per_week: number;
  weekday_time: string; // HH:MM format
  weekend_time: string; // HH:MM format
  start_date: Date;
  end_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TrainingPreferenceRow {
  id: string;
  user_id: string;
  target_race_id: string | null;
  fitness_level: FitnessLevel;
  target_hours_per_week: number;
  weekday_time: string;
  weekend_time: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROFILE (Legacy combined type for backward compatibility)
// Combines user_profiles, training_preferences, and races data
// ============================================================================

export interface Profile {
  id: string;
  race_date: Date;
  fitness_level: FitnessLevel;
  target_hours_per_week: number;
  weekday_time: string; // HH:MM format
  weekend_time: string; // HH:MM format
  timezone: string;
  google_calendar_id?: string;
  google_access_token?: string;
  google_refresh_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProfileRow {
  id: string;
  race_date: string;
  fitness_level: FitnessLevel;
  target_hours_per_week: number;
  weekday_time: string;
  weekend_time: string;
  timezone: string;
  google_calendar_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WORKOUTS
// ============================================================================

export interface Workout {
  id: string;
  user_id: string;
  discipline: Discipline;
  workout_type: WorkoutType;
  duration_minutes: number;
  scheduled_date: Date;
  scheduled_time: string; // HH:MM format
  description: string;
  status: WorkoutStatus;
  completed_at?: Date;
  week_number: number;
  phase: Phase;
  timezone?: string; // IANA timezone name (e.g., 'America/New_York')
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  discipline: Discipline;
  workout_type: WorkoutType;
  duration_minutes: number;
  scheduled_date: string;
  scheduled_time: string;
  description: string;
  status: WorkoutStatus;
  completed_at: string | null;
  week_number: number;
  phase: Phase;
  timezone: string | null; // IANA timezone name (e.g., 'America/New_York')
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WORKOUT LOGS
// ============================================================================

export interface WorkoutLog {
  id: string;
  workout_id: string;
  user_id: string;
  completed_at: Date;
  distance_km?: number;
  duration_seconds?: number;
  avg_pace_min_per_km?: number;
  avg_speed_kph?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_power_watts?: number;
  normalized_power_watts?: number;
  rpe?: number;
  temperature_celsius?: number;
  weather_conditions?: string;
  equipment_id?: string;
  athlete_notes?: string;
  feeling?: Feeling;
  data_source?: string;
  external_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutLogRow {
  id: string;
  workout_id: string;
  user_id: string;
  completed_at: string;
  distance_km: number | null;
  duration_seconds: number | null;
  avg_pace_min_per_km: number | null;
  avg_speed_kph: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_power_watts: number | null;
  normalized_power_watts: number | null;
  rpe: number | null;
  temperature_celsius: number | null;
  weather_conditions: string | null;
  equipment_id: string | null;
  athlete_notes: string | null;
  feeling: Feeling | null;
  data_source: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EQUIPMENT
// ============================================================================

export interface Equipment {
  id: string;
  user_id: string;
  type: EquipmentType;
  brand?: string;
  model?: string;
  nickname?: string;
  purchase_date?: Date;
  purchase_price?: number;
  retirement_date?: Date;
  status: EquipmentStatus;
  total_distance_km: number;
  total_duration_hours: number;
  last_maintenance_date?: Date;
  next_maintenance_date?: Date;
  maintenance_notes?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EquipmentRow {
  id: string;
  user_id: string;
  type: EquipmentType;
  brand: string | null;
  model: string | null;
  nickname: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  retirement_date: string | null;
  status: EquipmentStatus;
  total_distance_km: number;
  total_duration_hours: number;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BODY METRICS
// ============================================================================

export interface BodyMetric {
  id: string;
  user_id: string;
  recorded_at: Date;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  resting_heart_rate?: number;
  hrv_score?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  fatigue_level?: number;
  stress_level?: number;
  notes?: string;
  created_at: Date;
}

export interface BodyMetricRow {
  id: string;
  user_id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  resting_heart_rate: number | null;
  hrv_score: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  fatigue_level: number | null;
  stress_level: number | null;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// TRAINING ZONES
// ============================================================================

export interface TrainingZone {
  id: string;
  user_id: string;
  discipline: Discipline;
  zone_type: ZoneType;
  zone1_min: number;
  zone1_max: number;
  zone2_min: number;
  zone2_max: number;
  zone3_min: number;
  zone3_max: number;
  zone4_min: number;
  zone4_max: number;
  zone5_min: number;
  zone5_max: number;
  valid_from: Date;
  valid_to?: Date;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TrainingZoneRow {
  id: string;
  user_id: string;
  discipline: Discipline;
  zone_type: ZoneType;
  zone1_min: number;
  zone1_max: number;
  zone2_min: number;
  zone2_max: number;
  zone3_min: number;
  zone3_max: number;
  zone4_min: number;
  zone4_max: number;
  zone5_min: number;
  zone5_max: number;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PERSONAL RECORDS
// ============================================================================

export interface PersonalRecord {
  id: string;
  user_id: string;
  discipline: Discipline;
  distance_km: number;
  time_seconds: number;
  avg_pace_min_per_km?: number;
  avg_speed_kph?: number;
  achieved_at: Date;
  race_id?: string;
  location?: string;
  workout_log_id?: string;
  external_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalRecordRow {
  id: string;
  user_id: string;
  discipline: Discipline;
  distance_km: number;
  time_seconds: number;
  avg_pace_min_per_km: number | null;
  avg_speed_kph: number | null;
  achieved_at: string;
  race_id: string | null;
  location: string | null;
  workout_log_id: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INTEGRATIONS
// ============================================================================

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  provider_user_id?: string;
  /** Vault secret UUID (not the actual token) for encrypted OAuth access token */
  access_token?: string;
  /** Vault secret UUID (not the actual token) for encrypted OAuth refresh token */
  refresh_token?: string;
  token_expires_at?: Date;
  calendar_id?: string;
  sync_settings?: Record<string, any>;
  is_active: boolean;
  last_sync_at?: Date;
  last_sync_status?: string;
  last_sync_error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  provider_user_id: string | null;
  /** Vault secret UUID (not the actual token) for encrypted OAuth access token */
  access_token: string | null;
  /** Vault secret UUID (not the actual token) for encrypted OAuth refresh token */
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
  sync_settings: Record<string, any> | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

/**
 * Type-safe interface for Google Calendar integrations with Vault-based token storage.
 * Extends the base Integration interface with Google Calendar-specific semantics.
 */
export interface GoogleCalendarIntegration extends Omit<Integration, 'provider'> {
  provider: 'google_calendar';
  /** Vault UUID for encrypted access token - use vault_read_secret() to retrieve */
  access_token_vault_id?: string;
  /** Vault UUID for encrypted refresh token - use vault_read_secret() to retrieve */
  refresh_token_vault_id?: string;
}
