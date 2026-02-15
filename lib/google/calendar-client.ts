import { google } from 'googleapis';
import { createAuthenticatedClient } from './oauth-client';

/**
 * Creates an authenticated Google Calendar API client for the specified user.
 * Automatically handles token refresh through the underlying OAuth2Client.
 *
 * @param userId - User ID to retrieve tokens for
 * @returns Google Calendar v3 API client instance
 * @throws Error if no tokens found for user
 */
export async function getCalendarClient(userId: string) {
  const auth = await createAuthenticatedClient(userId);
  return google.calendar({ version: 'v3', auth });
}
