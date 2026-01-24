// Database type definitions

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Discipline = 'swim' | 'bike' | 'run';
export type WorkoutType = 'easy' | 'tempo' | 'intervals' | 'long';
export type WorkoutStatus = 'scheduled' | 'completed' | 'skipped';
export type Phase = 'base' | 'build' | 'peak' | 'taper';

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
  google_event_id?: string;
  week_number: number;
  phase: Phase;
  created_at: Date;
  updated_at: Date;
}

// Database row types (with snake_case from DB)
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
  google_event_id: string | null;
  week_number: number;
  phase: Phase;
  created_at: string;
  updated_at: string;
}
