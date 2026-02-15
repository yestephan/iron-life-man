import { google, Auth } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from '@/app/actions/calendar/tokens';

/**
 * Creates a new OAuth2 client instance with Google Calendar credentials.
 * No user credentials are set - this is for generating auth URLs or setting credentials later.
 *
 * @returns OAuth2Client instance configured with client ID, secret, and redirect URI
 */
export function createOAuth2ClientInstance(): Auth.OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error(
      'Missing required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or NEXT_PUBLIC_APP_URL'
    );
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth authorization URL with required scopes and security parameters.
 *
 * @param oauth2Client - OAuth2Client instance
 * @param state - CSRF state parameter for security
 * @returns Authorization URL to redirect user to Google consent screen
 */
export function generateAuthorizationUrl(oauth2Client: Auth.OAuth2Client, state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: Required for refresh token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.calendarlist',
    ],
    state,
    prompt: 'consent', // Force consent to ensure refresh_token is issued
    include_granted_scopes: true,
  });
}

/**
 * Creates an authenticated OAuth2Client with user's tokens loaded from Vault.
 * Automatically handles token refresh and persists new tokens back to Vault.
 *
 * @param userId - User ID to retrieve tokens for
 * @returns Authenticated OAuth2Client ready for Google API calls
 * @throws Error if no tokens found for user
 */
export async function createAuthenticatedClient(userId: string): Promise<Auth.OAuth2Client> {
  // Retrieve decrypted tokens from Vault
  const tokens = await getGoogleTokens(userId);

  if (!tokens) {
    throw new Error('No Google OAuth tokens found for user');
  }

  // Create OAuth2Client and set credentials
  const oauth2Client = createOAuth2ClientInstance();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Attach event listener for automatic token refresh
  // When googleapis library refreshes the token, persist it back to Vault
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      await updateGoogleTokens(userId, {
        access_token: newTokens.access_token ?? undefined,
        refresh_token: newTokens.refresh_token ?? undefined,
        expiry_date: newTokens.expiry_date
          ? new Date(newTokens.expiry_date).toISOString()
          : undefined,
      });
    } catch (error) {
      console.error('Failed to persist refreshed tokens to Vault:', error);
    }
  });

  return oauth2Client;
}
