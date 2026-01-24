import { supabase } from './client';
import { supabaseAdmin } from './server';
import type { Profile, Workout, ProfileRow, WorkoutRow } from '@/types/database';

// Helper to convert DB row to Profile
function profileRowToProfile(row: ProfileRow): Profile {
  return {
    ...row,
    race_date: new Date(row.race_date),
    google_calendar_id: row.google_calendar_id || undefined,
    google_access_token: row.google_access_token || undefined,
    google_refresh_token: row.google_refresh_token || undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

// Helper to convert DB row to Workout
function workoutRowToWorkout(row: WorkoutRow): Workout {
  return {
    ...row,
    scheduled_date: new Date(row.scheduled_date),
    completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
    google_event_id: row.google_event_id || undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

// Profile queries
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return profileRowToProfile(data as ProfileRow);
}

export async function createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: profile.id,
      race_date: profile.race_date.toISOString().split('T')[0],
      fitness_level: profile.fitness_level,
      target_hours_per_week: profile.target_hours_per_week,
      weekday_time: profile.weekday_time,
      weekend_time: profile.weekend_time,
      timezone: profile.timezone,
      google_calendar_id: profile.google_calendar_id,
      google_access_token: profile.google_access_token,
      google_refresh_token: profile.google_refresh_token,
    })
    .select()
    .single();

  if (error) throw error;
  return profileRowToProfile(data as ProfileRow);
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const updateData: any = {};

  if (updates.race_date) updateData.race_date = updates.race_date.toISOString().split('T')[0];
  if (updates.fitness_level) updateData.fitness_level = updates.fitness_level;
  if (updates.target_hours_per_week) updateData.target_hours_per_week = updates.target_hours_per_week;
  if (updates.weekday_time) updateData.weekday_time = updates.weekday_time;
  if (updates.weekend_time) updateData.weekend_time = updates.weekend_time;
  if (updates.timezone) updateData.timezone = updates.timezone;
  if (updates.google_calendar_id !== undefined) updateData.google_calendar_id = updates.google_calendar_id;
  if (updates.google_access_token !== undefined) updateData.google_access_token = updates.google_access_token;
  if (updates.google_refresh_token !== undefined) updateData.google_refresh_token = updates.google_refresh_token;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return profileRowToProfile(data as ProfileRow);
}

// Workout queries
export async function getWorkouts(userId: string, filters?: {
  weekNumber?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: true });

  if (filters?.weekNumber) {
    query = query.eq('week_number', filters.weekNumber);
  }
  if (filters?.startDate) {
    query = query.gte('scheduled_date', filters.startDate.toISOString().split('T')[0]);
  }
  if (filters?.endDate) {
    query = query.lte('scheduled_date', filters.endDate.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ? data.map(row => workoutRowToWorkout(row as WorkoutRow)) : [];
}

export async function getWorkout(workoutId: string): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (error || !data) return null;
  return workoutRowToWorkout(data as WorkoutRow);
}

export async function createWorkouts(workouts: Omit<Workout, 'id' | 'created_at' | 'updated_at'>[]) {
  const insertData = workouts.map(workout => ({
    user_id: workout.user_id,
    discipline: workout.discipline,
    workout_type: workout.workout_type,
    duration_minutes: workout.duration_minutes,
    scheduled_date: workout.scheduled_date.toISOString().split('T')[0],
    scheduled_time: workout.scheduled_time,
    description: workout.description,
    status: workout.status,
    completed_at: workout.completed_at?.toISOString(),
    google_event_id: workout.google_event_id,
    week_number: workout.week_number,
    phase: workout.phase,
  }));

  const { data, error } = await supabase
    .from('workouts')
    .insert(insertData)
    .select();

  if (error) throw error;
  return data ? data.map(row => workoutRowToWorkout(row as WorkoutRow)) : [];
}

export async function updateWorkout(workoutId: string, updates: Partial<Workout>) {
  const updateData: any = {};

  if (updates.scheduled_date) updateData.scheduled_date = updates.scheduled_date.toISOString().split('T')[0];
  if (updates.scheduled_time) updateData.scheduled_time = updates.scheduled_time;
  if (updates.status) updateData.status = updates.status;
  if (updates.completed_at) updateData.completed_at = updates.completed_at.toISOString();
  if (updates.google_event_id !== undefined) updateData.google_event_id = updates.google_event_id;

  const { data, error } = await supabase
    .from('workouts')
    .update(updateData)
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return workoutRowToWorkout(data as WorkoutRow);
}
