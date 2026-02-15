import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOAuth2ClientInstance, generateAuthorizationUrl } from '@/lib/google/oauth-client';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Initiates the Google OAuth flow by redirecting to Google's consent screen.
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Generate CSRF state token
 * 3. Store state in httpOnly cookie
 * 4. Redirect to Google OAuth consent screen
 *
 * Query params:
 * - redirect: Optional path to redirect to after OAuth completion (default: onboarding flow)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // 2. Generate CSRF state token
    const state = randomUUID();

    // 3. Create OAuth2Client and generate authorization URL
    const oauth2Client = createOAuth2ClientInstance();
    const authUrl = generateAuthorizationUrl(oauth2Client, state);

    // 4. Create response with redirect to Google
    const response = NextResponse.redirect(authUrl);

    // 5. Set state in httpOnly cookie (expires in 10 minutes)
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // 6. Store redirect path if provided
    const searchParams = request.nextUrl.searchParams;
    const redirectPath = searchParams.get('redirect');
    if (redirectPath) {
      response.cookies.set('oauth_redirect', redirectPath, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.redirect(
      new URL('/onboarding/calendar-connect?error=authorization_failed', request.url)
    );
  }
}
