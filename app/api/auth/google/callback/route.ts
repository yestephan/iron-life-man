import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOAuth2ClientInstance } from '@/lib/google/oauth-client';
import { storeGoogleTokens } from '@/app/actions/calendar/tokens';

export const dynamic = 'force-dynamic';

/**
 * Handles the OAuth callback from Google.
 *
 * Flow:
 * 1. Extract code, state, and error from query params
 * 2. Handle OAuth denial/cancel gracefully (treat as skip)
 * 3. Validate CSRF state token
 * 4. Verify user is authenticated
 * 5. Exchange code for tokens
 * 6. Store encrypted tokens in Vault
 * 7. Redirect to calendar selection or custom redirect path
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  try {
    // 1. Handle OAuth denial/cancel (user clicked "Cancel" on Google consent screen)
    if (error === 'access_denied') {
      const response = NextResponse.redirect(
        new URL('/onboarding/calendar-connect?skipped=true', request.url)
      );
      // Clean up cookies
      response.cookies.delete('oauth_state');
      response.cookies.delete('oauth_redirect');
      return response;
    }

    // 2. Validate state parameter against stored cookie (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/onboarding/calendar-connect?error=invalid_state', request.url)
      );
    }

    // 3. Ensure code is present
    if (!code) {
      return NextResponse.redirect(
        new URL('/onboarding/calendar-connect?error=missing_code', request.url)
      );
    }

    // 4. Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // 5. Exchange authorization code for tokens
    const oauth2Client = createOAuth2ClientInstance();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // 6. Store encrypted tokens in Vault
    await storeGoogleTokens(
      user.id,
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString()
    );

    // 7. Determine redirect path
    const customRedirect = request.cookies.get('oauth_redirect')?.value;
    const redirectPath = customRedirect || '/onboarding/calendar-connect?step=select';

    // 8. Create response and clean up cookies
    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_redirect');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);

    // Clean up cookies on error
    const response = NextResponse.redirect(
      new URL('/onboarding/calendar-connect?error=token_exchange', request.url)
    );
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_redirect');

    return response;
  }
}
