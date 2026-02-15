import { createClient } from './server';
import { supabaseAdmin } from './server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Profile,
  Workout,
  ProfileRow,
  WorkoutRow,
  UserProfileRow,
  TrainingPreferenceRow,
  RaceRow,
  IntegrationRow,
} from '@/types/database';

// Helper to combine data from new schema tables into Profile
function combineToProfile(
  userProfile: UserProfileRow | null,
  trainingPref: TrainingPreferenceRow | null,
  race: RaceRow | null,
  integration: IntegrationRow | null
): Profile | null {
  if (!userProfile || !trainingPref || !race) {
    return null;
  }

  return {
    id: userProfile.id,
    race_date: new Date(race.race_date),
    fitness_level: trainingPref.fitness_level,
    target_hours_per_week: trainingPref.target_hours_per_week,
    weekday_time: trainingPref.weekday_time,
    weekend_time: trainingPref.weekend_time,
    timezone: userProfile.timezone,
    google_calendar_id: integration?.calendar_id || undefined,
    google_access_token: integration?.access_token || undefined,
    google_refresh_token: integration?.refresh_token || undefined,
    created_at: new Date(userProfile.created_at),
    updated_at: new Date(userProfile.updated_at),
  };
}

// Helper to convert DB row to Workout
function workoutRowToWorkout(row: WorkoutRow): Workout {
  return {
    ...row,
    scheduled_date: new Date(row.scheduled_date),
    completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
    timezone: row.timezone ?? undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

// Profile queries
export async function getProfile(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<Profile | null> {
  const client = supabaseClient || (await createClient());

  // Fetch user profile
  const { data: userProfile, error: userProfileError } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userProfileError || !userProfile) return null;

  // Fetch active training preference
  const { data: trainingPref, error: trainingPrefError } = await client
    .from('training_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (trainingPrefError || !trainingPref) return null;

  // Fetch target race (if linked)
  let race: RaceRow | null = null;
  if (trainingPref.target_race_id) {
    const { data: raceData, error: raceError } = await client
      .from('races')
      .select('*')
      .eq('id', trainingPref.target_race_id)
      .single();

    if (!raceError && raceData) {
      race = raceData as RaceRow;
    }
  } else {
    // If no target race linked, find the user's next upcoming race
    const { data: raceData, error: raceError } = await client
      .from('races')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'upcoming')
      .order('race_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!raceError && raceData) {
      race = raceData as RaceRow;
    }
  }

  if (!race) return null;

  // Fetch Google Calendar integration if exists
  const { data: integration } = await client
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .eq('is_active', true)
    .single();

  return combineToProfile(
    userProfile as UserProfileRow,
    trainingPref as TrainingPreferenceRow,
    race,
    (integration as IntegrationRow) || null
  );
}

export async function createProfile(
  profile: Omit<Profile, 'created_at' | 'updated_at'>,
  supabaseClient?: SupabaseClient
) {
  // Use provided client or authenticated client (respects RLS)
  const client = supabaseClient || (await createClient());

  // 1. Create or update user_profiles
  const { data: userProfile, error: userProfileError } = await client
    .from('user_profiles')
    .upsert(
      {
        id: profile.id,
        timezone: profile.timezone,
      },
      {
        onConflict: 'id',
      }
    )
    .select()
    .single();

  if (userProfileError) throw userProfileError;

  // 2. Create race
  const trainingStart = new Date(profile.race_date);
  trainingStart.setDate(trainingStart.getDate() - 16 * 7); // 16 weeks before race

  const { data: race, error: raceError } = await client
    .from('races')
    .insert({
      user_id: profile.id,
      race_name: 'Target Race',
      race_date: profile.race_date.toISOString().split('T')[0],
      race_type: 'full', // Default, can be updated later
      status: 'upcoming',
      priority: 'A',
    })
    .select()
    .single();

  if (raceError) throw raceError;

  // 3. Create training_preferences
  const { data: trainingPref, error: trainingPrefError } = await client
    .from('training_preferences')
    .insert({
      user_id: profile.id,
      target_race_id: race.id,
      fitness_level: profile.fitness_level,
      target_hours_per_week: profile.target_hours_per_week,
      weekday_time: profile.weekday_time,
      weekend_time: profile.weekend_time,
      start_date: trainingStart.toISOString().split('T')[0],
      is_active: true,
    })
    .select()
    .single();

  if (trainingPrefError) throw trainingPrefError;

  // 4. Create Google Calendar integration if tokens provided
  if (profile.google_access_token) {
    await client
      .from('integrations')
      .upsert(
        {
          user_id: profile.id,
          provider: 'google_calendar',
          access_token: profile.google_access_token,
          refresh_token: profile.google_refresh_token,
          calendar_id: profile.google_calendar_id,
          is_active: true,
        },
        {
          onConflict: 'user_id,provider',
        }
      );
  }

  // Return combined profile
  return combineToProfile(
    userProfile as UserProfileRow,
    trainingPref as TrainingPreferenceRow,
    race as RaceRow,
    null
  ) as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
  supabaseClient?: SupabaseClient
) {
  const client = supabaseClient || (await createClient());

  // Get current profile to find related records
  const currentProfile = await getProfile(userId, client);
  if (!currentProfile) {
    throw new Error('Profile not found');
  }

  // Get active training preference to find target race
  const { data: trainingPref } = await client
    .from('training_preferences')
    .select('target_race_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  const targetRaceId = trainingPref?.target_race_id;

  // Update user_profiles if timezone changed
  if (updates.timezone) {
    await client
      .from('user_profiles')
      .update({ timezone: updates.timezone })
      .eq('id', userId);
  }

  // Update race if race_date changed
  if (updates.race_date && targetRaceId) {
    await client
      .from('races')
      .update({ race_date: updates.race_date.toISOString().split('T')[0] })
      .eq('id', targetRaceId);
  }

  // Update training_preferences
  const trainingPrefUpdates: any = {};
  if (updates.fitness_level) trainingPrefUpdates.fitness_level = updates.fitness_level;
  if (updates.target_hours_per_week)
    trainingPrefUpdates.target_hours_per_week = updates.target_hours_per_week;
  if (updates.weekday_time) trainingPrefUpdates.weekday_time = updates.weekday_time;
  if (updates.weekend_time) trainingPrefUpdates.weekend_time = updates.weekend_time;

  if (Object.keys(trainingPrefUpdates).length > 0) {
    await client
      .from('training_preferences')
      .update(trainingPrefUpdates)
      .eq('user_id', userId)
      .eq('is_active', true);
  }

  // Update Google Calendar integration if provided
  if (
    updates.google_access_token !== undefined ||
    updates.google_refresh_token !== undefined ||
    updates.google_calendar_id !== undefined
  ) {
    const integrationUpdates: any = {};
    if (updates.google_access_token !== undefined)
      integrationUpdates.access_token = updates.google_access_token;
    if (updates.google_refresh_token !== undefined)
      integrationUpdates.refresh_token = updates.google_refresh_token;
    if (updates.google_calendar_id !== undefined)
      integrationUpdates.calendar_id = updates.google_calendar_id;

    await client
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'google_calendar',
          ...integrationUpdates,
          is_active: true,
        },
        {
          onConflict: 'user_id,provider',
        }
      );
  }

  // Return updated profile
  return getProfile(userId, client) as Promise<Profile>;
}

// Workout queries
export async function getWorkouts(
  userId: string,
  filters?: {
    weekNumber?: number;
    startDate?: Date;
    endDate?: Date;
  },
  supabaseClient?: SupabaseClient
) {
  const client = supabaseClient || (await createClient());
  let query = client
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
  return data ? data.map((row) => workoutRowToWorkout(row as WorkoutRow)) : [];
}

export async function getWorkout(
  workoutId: string,
  supabaseClient?: SupabaseClient
): Promise<Workout | null> {
  const client = supabaseClient || (await createClient());
  const { data, error } = await client.from('workouts').select('*').eq('id', workoutId).single();

  if (error || !data) return null;
  return workoutRowToWorkout(data as WorkoutRow);
}

/**
 * Creates workouts in batches for efficiency.
 * Automatically chunks large arrays to avoid Supabase batch insert limits.
 *
 * @param workouts Array of workouts to insert
 * @param batchSize Number of workouts per batch (default: 100)
 * @param supabaseClient Optional Supabase client (uses authenticated client if not provided)
 * @returns Array of created workouts
 */
export async function createWorkouts(
  workouts: Omit<Workout, 'id' | 'created_at' | 'updated_at'>[],
  batchSize: number = 100,
  supabaseClient?: SupabaseClient
) {
  if (workouts.length === 0) return [];

  // Use provided client or authenticated client (respects RLS)
  // For bulk operations during onboarding, the authenticated client is sufficient
  const client = supabaseClient || (await createClient());

  // Transform workouts to insert format once
  const insertData = workouts.map((workout) => ({
    user_id: workout.user_id,
    discipline: workout.discipline,
    workout_type: workout.workout_type,
    duration_minutes: workout.duration_minutes,
    scheduled_date: workout.scheduled_date.toISOString().split('T')[0],
    scheduled_time: workout.scheduled_time,
    description: workout.description,
    status: workout.status,
    completed_at: workout.completed_at?.toISOString(),
    week_number: workout.week_number,
    phase: workout.phase,
    timezone: workout.timezone,
  }));

  // If batch is small enough, insert in one go (most efficient)
  if (insertData.length <= batchSize) {
    const { data, error } = await client.from('workouts').insert(insertData).select();
    if (error) throw error;
    return data ? data.map((row) => workoutRowToWorkout(row as WorkoutRow)) : [];
  }

  // For large batches, chunk and insert sequentially
  // This prevents hitting Supabase batch insert limits (~1000 rows)
  const allCreated: WorkoutRow[] = [];

  for (let i = 0; i < insertData.length; i += batchSize) {
    const chunk = insertData.slice(i, i + batchSize);
    const { data, error } = await client.from('workouts').insert(chunk).select();

    if (error) {
      throw new Error(
        `Failed to insert workouts batch ${Math.floor(i / batchSize) + 1}: ${error.message}`
      );
    }

    if (data) {
      allCreated.push(...(data as WorkoutRow[]));
    }
  }

  return allCreated.map((row) => workoutRowToWorkout(row));
}

export async function updateWorkout(
  workoutId: string,
  updates: Partial<Workout>,
  supabaseClient?: SupabaseClient
) {
  const updateData: any = {};

  if (updates.scheduled_date)
    updateData.scheduled_date = updates.scheduled_date.toISOString().split('T')[0];
  if (updates.scheduled_time) updateData.scheduled_time = updates.scheduled_time;
  if (updates.status) updateData.status = updates.status;
  if (updates.completed_at) updateData.completed_at = updates.completed_at.toISOString();

  const client = supabaseClient || (await createClient());
  const { data, error } = await client
    .from('workouts')
    .update(updateData)
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return workoutRowToWorkout(data as WorkoutRow);
}
