'use server';

import { getCalendarClient } from '@/lib/google/calendar-client';
import { createClient } from '@/lib/supabase/server';

/**
 * Lists all writable calendars for the user.
 * Only calendars where the user has 'writer' or 'owner' access are returned.
 *
 * @param userId - User ID to retrieve calendars for
 * @returns Array of calendar objects with id, summary, primary flag, and backgroundColor
 * @throws Error if token is invalid or API call fails
 */
export async function listWritableCalendars(
  userId: string
): Promise<Array<{ id: string; summary: string; primary: boolean; backgroundColor?: string }>> {
  try {
    const calendar = await getCalendarClient(userId);

    const response = await calendar.calendarList.list({
      minAccessRole: 'writer', // Only return calendars user can write to
      showDeleted: false,
      showHidden: false,
    });

    if (!response.data.items || response.data.items.length === 0) {
      return [];
    }

    return response.data.items.map((item) => ({
      id: item.id!,
      summary: item.summary!,
      primary: item.primary || false,
      backgroundColor: item.backgroundColor ?? undefined,
    }));
  } catch (error: any) {
    // Handle token expiration/invalid token errors
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      throw new Error('Calendar connection expired. Please reconnect.');
    }
    throw error;
  }
}

/**
 * Creates a new "Iron Life Man" calendar in the user's Google Calendar account.
 * Uses the user's timezone from their profile, or falls back to detected/default timezone.
 *
 * @param userId - User ID to create calendar for
 * @returns Object with calendar id and summary
 * @throws Error if calendar creation fails
 */
export async function createIronLifeManCalendar(
  userId: string
): Promise<{ id: string; summary: string }> {
  const calendar = await getCalendarClient(userId);
  const supabase = await createClient();

  // Fetch user's timezone from profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('id', userId)
    .single();

  let timezone = 'America/New_York'; // Default fallback

  if (!profileError && profile?.timezone) {
    timezone = profile.timezone;
  } else {
    // Try to detect timezone if not in profile
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // Use default if detection fails
    }
  }

  // CRITICAL per research pitfall #6: Always set timeZone when creating calendar
  // Never leave it as UTC default
  const response = await calendar.calendars.insert({
    requestBody: {
      summary: 'Iron Life Man',
      description: 'Triathlon training workouts managed by Iron Life Man',
      timeZone: timezone,
    },
  });

  return {
    id: response.data.id!,
    summary: response.data.summary!,
  };
}

/**
 * Saves the selected calendar ID to the user's Google Calendar integration record.
 * Updates the calendar_id field and marks the integration as updated.
 *
 * @param userId - User ID
 * @param calendarId - Google Calendar ID to save
 * @throws Error if no integration found or update fails
 */
export async function selectCalendar(userId: string, calendarId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('integrations')
    .update({
      calendar_id: calendarId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');

  if (error) {
    throw new Error('No Google Calendar integration found. Please connect first.');
  }
}
