# Phase 1: OAuth Foundation - Research

**Researched:** 2026-02-12
**Domain:** Google Calendar OAuth 2.0 implementation with Next.js 16 App Router
**Confidence:** HIGH

## Summary

Phase 1 establishes secure Google Calendar integration using OAuth 2.0 with the official googleapis library. The implementation uses Next.js 16 Route Handlers for OAuth callbacks, Supabase Vault for encrypted token storage, and automatic token refresh with the googleapis OAuth2Client.

The standard pattern: Route Handlers manage OAuth flow (initiate → callback → exchange code for tokens), Server Actions handle database operations (store/retrieve encrypted tokens), googleapis OAuth2Client manages token lifecycle (automatic refresh, expiration handling), and Supabase Vault encrypts tokens at rest.

**Primary recommendation:** Use googleapis OAuth2Client with automatic token refresh, store encrypted tokens in Supabase Vault using vault.create_secret(), implement OAuth flow via Next.js Route Handlers, and integrate calendar selection into existing onboarding flow after availability step.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Authorization Flow UX:**
- Timing: During onboarding (after availability step, before plan generation)
- Optional with skip - user can skip during onboarding but it's encouraged
- Skip consequence: If skipped, calendar connection available in settings only (no repeated prompts)
- OAuth redirect: After user approves on Google, continue to next logical step in onboarding flow
- OAuth denial/cancel: Treat same as skip - continue without calendar, available in settings later
- Permission transparency: Show permissions first - explain we need read/write calendar access before sending to Google

**Calendar Selection:**
- UI component: Dropdown list to select calendar
- Calendars to show: Only writable calendars (filter out read-only automatically)
- Change calendar later: Yes, but warn about existing events when switching calendars
- Default selection: Create dedicated "Iron Life Man" calendar and pre-select it (offer to create during setup)

**Connection Status Visibility:**
- Status indicator locations: All of the above - dashboard header/nav, settings page, and workout calendar view
- Disconnect option: Yes, with both confirmation and consequences (explain workouts will stop syncing before confirming)
- Error states: Status indicator changes (icon turns red/warning color with error text)

### Claude's Discretion

- Onboarding placement: Claude picks natural spot in onboarding flow (after availability, before or after plan generation)
- Button wording: Claude picks appropriate authorization button text
- Status indicator style: Claude picks appropriate visual indicator for connection status
- Token refresh timing: Claude picks refresh strategy (proactive, on-expiration, or lazy)
- Refresh failure handling: Claude handles token refresh failures appropriately
- User awareness of refresh: Claude decides notification level for token refresh operations
- Retry logic: Claude picks retry strategy for failed token refreshes

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. Calendar sync operations (writing workouts, reading conflicts) are in Phases 2 and 3 as planned.

</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | ^128.0.0 (latest: ^171.4.0) | Google Calendar API client | Official Google library, automatic token refresh, comprehensive OAuth2 support |
| Next.js 16 | ^16.0.0 | App Router with Route Handlers | Route Handlers are standard for OAuth callbacks in App Router |
| Supabase Vault | (built-in extension) | Encrypted secret storage | Official Supabase extension for OAuth token encryption at rest |
| date-fns-tz | ^2.0.0 | IANA timezone handling | Already in project, standard for timezone-aware scheduling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | ^0.8.0 | Server-side Supabase client | Required for Route Handlers and Server Actions |
| zod | ^3.22.0 | OAuth response validation | Validate token responses, calendar data |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| googleapis | google-auth-library (standalone) | Standalone library has fewer features, googleapis includes auth + API methods |
| Supabase Vault | pgsodium directly | Vault provides simpler API, pgsodium being phased out as standalone |
| Route Handlers | NextAuth.js | NextAuth adds complexity for single provider, Route Handlers give more control |

**Installation:**
```bash
# googleapis already installed at v128.0.0
# Consider upgrading to latest for security patches:
npm install googleapis@latest

# All other dependencies already installed
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   └── auth/
│       └── google/
│           ├── authorize/
│           │   └── route.ts         # Initiate OAuth flow
│           └── callback/
│               └── route.ts         # Handle OAuth callback
├── (auth)/
│   └── onboarding/
│       ├── layout.tsx               # Shared onboarding layout
│       ├── welcome/
│       ├── race-info/
│       ├── availability/
│       ├── calendar-connect/        # NEW: Calendar OAuth step
│       │   └── page.tsx
│       └── plan-generation/
└── actions/
    └── calendar/
        ├── oauth.ts                 # Server Actions for OAuth operations
        ├── tokens.ts                # Token encryption/decryption with Vault
        └── calendars.ts             # Calendar list/create operations

lib/
├── google/
│   ├── oauth-client.ts              # OAuth2Client factory
│   └── calendar-client.ts           # Authenticated Calendar API client
└── supabase/
    └── server.ts                    # Supabase server client (existing)
```

### Pattern 1: OAuth Flow with Route Handlers

**What:** Use Next.js 16 Route Handlers for OAuth initiation and callback endpoints
**When to use:** All OAuth flows in App Router (standard pattern)

**Example:**
```typescript
// app/api/auth/google/authorize/route.ts
// Source: https://developers.google.com/identity/protocols/oauth2/web-server
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  // Generate state for CSRF protection
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: Required for refresh token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.calendarlist',
    ],
    state: state,
    prompt: 'consent', // Force consent to ensure refresh_token
  });

  return NextResponse.redirect(authUrl);
}
```

**Callback handler:**
```typescript
// app/api/auth/google/callback/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;

  // Handle OAuth denial/error - treat as skip
  if (error === 'access_denied') {
    cookieStore.delete('oauth_state');
    return NextResponse.redirect(new URL('/onboarding/plan-generation', request.url));
  }

  // Validate state (CSRF protection)
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/onboarding/calendar-connect?error=invalid_state', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding/calendar-connect?error=missing_code', request.url));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Store encrypted tokens in Supabase Vault
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Store tokens using Server Action or direct DB call
    await supabase.rpc('store_google_oauth_tokens', {
      p_user_id: user.id,
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token,
      p_expires_at: new Date(tokens.expiry_date!).toISOString(),
    });

    cookieStore.delete('oauth_state');

    // Redirect to calendar selection
    return NextResponse.redirect(new URL('/onboarding/calendar-connect?step=select', request.url));
  } catch (err) {
    console.error('OAuth token exchange failed:', err);
    return NextResponse.redirect(new URL('/onboarding/calendar-connect?error=token_exchange', request.url));
  }
}
```

### Pattern 2: Token Encryption with Supabase Vault

**What:** Use Supabase Vault to encrypt OAuth tokens at rest, never store plaintext tokens
**When to use:** All sensitive data storage (OAuth tokens, API keys, credentials)

**Example:**
```typescript
// Server Action: app/actions/calendar/tokens.ts
// Source: https://supabase.com/docs/guides/database/vault
'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function storeGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresAt: string
) {
  const supabase = await createServerClient();

  // Store access token in Vault
  const { data: accessSecret } = await supabase.rpc('vault_create_secret', {
    secret: accessToken,
    name: `google_access_${userId}`,
    description: 'Google Calendar access token',
  });

  // Store refresh token in Vault (only if provided)
  let refreshSecretId = null;
  if (refreshToken) {
    const { data: refreshSecret } = await supabase.rpc('vault_create_secret', {
      secret: refreshToken,
      name: `google_refresh_${userId}`,
      description: 'Google Calendar refresh token',
    });
    refreshSecretId = refreshSecret?.id;
  }

  // Store integration metadata (NOT the actual tokens)
  const { error } = await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: 'google_calendar',
      access_token: accessSecretId, // Store Vault secret ID, not token
      refresh_token: refreshSecretId,
      token_expires_at: expiresAt,
      is_active: true,
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'connected',
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) throw error;
}

export async function getGoogleTokens(userId: string) {
  const supabase = await createServerClient();

  // Get integration record
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();

  if (error || !integration) return null;

  // Retrieve decrypted tokens from Vault
  const { data: secrets } = await supabase
    .from('vault.decrypted_secrets')
    .select('id, decrypted_secret')
    .in('id', [integration.access_token, integration.refresh_token].filter(Boolean));

  const accessToken = secrets?.find(s => s.id === integration.access_token)?.decrypted_secret;
  const refreshToken = secrets?.find(s => s.id === integration.refresh_token)?.decrypted_secret;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(integration.token_expires_at).getTime(),
  };
}
```

**Database function (PostgreSQL):**
```sql
-- Create wrapper function for vault.create_secret (RPC callable)
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret TEXT,
  name TEXT,
  description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Only allow authenticated users to create secrets for themselves
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT vault.create_secret(secret, name, description) INTO secret_id;
  RETURN secret_id;
END;
$$;
```

### Pattern 3: Automatic Token Refresh

**What:** Use googleapis OAuth2Client automatic token refresh with token event listener
**When to use:** All Google API calls requiring authentication

**Example:**
```typescript
// lib/google/oauth-client.ts
// Source: https://github.com/googleapis/google-api-nodejs-client
import { google } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from '@/app/actions/calendar/tokens';

export async function createOAuth2Client(userId: string) {
  const tokens = await getGoogleTokens(userId);

  if (!tokens) {
    throw new Error('No Google OAuth tokens found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  oauth2Client.setCredentials(tokens);

  // Listen for token refresh events
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('OAuth tokens refreshed automatically');

    // Store updated tokens in Vault
    await updateGoogleTokens(userId, {
      access_token: newTokens.access_token!,
      refresh_token: newTokens.refresh_token, // May be null on refresh
      expiry_date: new Date(newTokens.expiry_date!).toISOString(),
    });
  });

  return oauth2Client;
}

// lib/google/calendar-client.ts
import { google } from 'googleapis';
import { createOAuth2Client } from './oauth-client';

export async function getCalendarClient(userId: string) {
  const auth = await createOAuth2Client(userId);
  return google.calendar({ version: 'v3', auth });
}
```

### Pattern 4: Calendar List and Selection

**What:** List user's writable calendars using minAccessRole parameter, offer to create dedicated calendar
**When to use:** Calendar selection during onboarding and settings

**Example:**
```typescript
// app/actions/calendar/calendars.ts
// Source: https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
'use server';

import { getCalendarClient } from '@/lib/google/calendar-client';
import { createServerClient } from '@/lib/supabase/server';

export async function listWritableCalendars(userId: string) {
  const calendar = await getCalendarClient(userId);

  // minAccessRole='writer' returns only calendars with write access
  const { data } = await calendar.calendarList.list({
    minAccessRole: 'writer',
  });

  return data.items?.map(cal => ({
    id: cal.id!,
    summary: cal.summary!,
    primary: cal.primary || false,
    backgroundColor: cal.backgroundColor,
  })) || [];
}

export async function createIronLifeManCalendar(userId: string) {
  const calendar = await getCalendarClient(userId);

  // Create new calendar
  const { data } = await calendar.calendars.insert({
    requestBody: {
      summary: 'Iron Life Man',
      description: 'Triathlon training workouts managed by Iron Life Man',
      timeZone: 'America/New_York', // Will be updated to user's timezone
    },
  });

  return {
    id: data.id!,
    summary: data.summary!,
  };
}

export async function selectCalendar(userId: string, calendarId: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('integrations')
    .update({
      calendar_id: calendarId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');

  if (error) throw error;
}
```

### Pattern 5: Onboarding Integration

**What:** Add calendar connection as optional step in multi-step onboarding flow
**When to use:** During onboarding after availability collection

**Example:**
```typescript
// app/(auth)/onboarding/calendar-connect/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { listWritableCalendars, createIronLifeManCalendar, selectCalendar } from '@/app/actions/calendar/calendars';

export default function CalendarConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get('step'); // 'connect' or 'select'
  const error = searchParams.get('error');

  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (step === 'select') {
      loadCalendars();
    }
  }, [step]);

  async function loadCalendars() {
    const cals = await listWritableCalendars();
    setCalendars(cals);
  }

  async function handleCreateCalendar() {
    setIsCreating(true);
    try {
      const newCal = await createIronLifeManCalendar();
      setCalendars([newCal, ...calendars]);
      setSelectedCalendarId(newCal.id);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleContinue() {
    if (selectedCalendarId) {
      await selectCalendar(selectedCalendarId);
    }
    router.push('/onboarding/plan-generation');
  }

  function handleSkip() {
    router.push('/onboarding/plan-generation');
  }

  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Select Your Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Choose where your workouts will appear
          </p>
        </div>

        <Button
          onClick={handleCreateCalendar}
          disabled={isCreating}
          variant="outline"
        >
          Create "Iron Life Man" Calendar (Recommended)
        </Button>

        <select
          value={selectedCalendarId}
          onChange={(e) => setSelectedCalendarId(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a calendar...</option>
          {calendars.map(cal => (
            <option key={cal.id} value={cal.id}>
              {cal.summary} {cal.primary ? '(Primary)' : ''}
            </option>
          ))}
        </select>

        <div className="flex gap-4">
          <Button onClick={handleContinue} disabled={!selectedCalendarId}>
            Continue
          </Button>
          <Button onClick={handleSkip} variant="outline">
            Skip for Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connect Google Calendar</h1>
        <p className="text-muted-foreground mt-2">
          Sync your workouts to Google Calendar automatically
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error === 'invalid_state' && 'Security validation failed. Please try again.'}
            {error === 'token_exchange' && 'Failed to connect. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Permissions Needed</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ View your calendars</li>
          <li>✓ Create and manage workout events</li>
          <li>✓ Update events when your plan changes</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          We'll only access your Google Calendar. No other data.
        </p>
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <a href="/api/auth/google/authorize">
            Connect Google Calendar
          </a>
        </Button>
        <Button onClick={handleSkip} variant="outline">
          Skip for Now
        </Button>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Storing plaintext tokens in database**: Always use Supabase Vault encryption, never store tokens directly in application tables
- **Not handling token refresh failures**: Implement retry logic and user notification when refresh tokens become invalid
- **Skipping state parameter validation**: Always validate state parameter in OAuth callback to prevent CSRF attacks
- **Using client-side OAuth flow**: OAuth must happen server-side (Route Handlers) to protect client secret
- **Not setting access_type='offline'**: Without this, you won't receive refresh token on first authorization
- **Caching Route Handlers**: OAuth callbacks must be dynamic, never add caching directives to OAuth routes

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token refresh | Custom token expiry checker + manual refresh | googleapis OAuth2Client with tokens event | Library handles expiry timing, concurrent requests, race conditions, and error retry automatically |
| Token encryption | Custom AES encryption implementation | Supabase Vault (vault.create_secret) | Vault manages encryption keys separately from database, handles key rotation, provides audit trail |
| CSRF protection | Custom random string generator + session storage | Next.js cookies() with httpOnly + state parameter | Framework-level security, proper same-site policies, automatic cleanup |
| Calendar timezone handling | Date arithmetic with UTC offsets | date-fns-tz with IANA timezones | Handles DST transitions, timezone rule changes, historical date accuracy |
| OAuth scope validation | Parsing JWT manually | Supabase RLS with auth.jwt() | Database-level authorization, prevents data leakage even if application code has bugs |

**Key insight:** OAuth token management is deceptively complex. Refresh tokens can expire (6 months inactive, password changes, user revocation), concurrent requests can cause race conditions, and timezone handling requires historical rule data. Use battle-tested libraries.

---

## Common Pitfalls

### Pitfall 1: Missing Refresh Token on Subsequent Authorizations

**What goes wrong:** User re-authorizes app but refresh_token is null, breaking automatic token refresh
**Why it happens:** Google only returns refresh_token on first authorization. Subsequent authorizations without prompt='consent' return null
**How to avoid:** Always include prompt='consent' in generateAuthUrl() OR revoke access before re-authorization
**Warning signs:** Token refresh fails with "invalid_grant" error, access_token works but refresh_token is null in database

```typescript
// WRONG: No prompt parameter
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

// RIGHT: Force consent to get refresh_token
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent', // Forces consent screen, ensures refresh_token
});
```

### Pitfall 2: CSRF Vulnerability Without State Validation

**What goes wrong:** Attacker can trick user into authorizing attacker's Google account on user's Iron Life Man account
**Why it happens:** OAuth callback doesn't validate state parameter, allowing cross-site request forgery
**How to avoid:** Generate random state, store in httpOnly cookie, validate in callback before accepting code
**Warning signs:** Security audit fails, no state validation in callback handler

```typescript
// WRONG: No state validation
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const { tokens } = await oauth2Client.getToken(code); // VULNERABLE
}

// RIGHT: State generation and validation
// In authorize route:
const state = crypto.randomUUID();
cookieStore.set('oauth_state', state, { httpOnly: true, maxAge: 600 });

// In callback route:
const state = searchParams.get('state');
const storedState = cookieStore.get('oauth_state')?.value;
if (!state || state !== storedState) {
  return NextResponse.redirect('/error?code=invalid_state');
}
cookieStore.delete('oauth_state'); // Single-use token
```

### Pitfall 3: Token Expiration Without Refresh

**What goes wrong:** Access token expires after 1 hour, API calls fail with 401 Unauthorized
**Why it happens:** Not listening to 'tokens' event or not storing updated tokens after automatic refresh
**How to avoid:** Attach 'tokens' event listener to OAuth2Client, persist new tokens to Vault when received
**Warning signs:** API calls work for first hour then fail, logs show "token expired" errors

```typescript
// WRONG: No token event listener
const oauth2Client = new google.auth.OAuth2(...);
oauth2Client.setCredentials(tokens);
// Tokens refresh automatically but aren't persisted

// RIGHT: Listen and persist refreshed tokens
oauth2Client.on('tokens', async (newTokens) => {
  await updateGoogleTokens(userId, {
    access_token: newTokens.access_token!,
    refresh_token: newTokens.refresh_token, // May be null
    expiry_date: new Date(newTokens.expiry_date!).toISOString(),
  });
});
```

### Pitfall 4: Storing Vault Secret Values Instead of IDs

**What goes wrong:** Token secret values stored in integrations table instead of Vault secret IDs
**Why it happens:** Misunderstanding Vault pattern - vault.create_secret() returns ID, not the secret
**How to avoid:** Store the UUID returned by vault.create_secret() in integrations table, retrieve from vault.decrypted_secrets view
**Warning signs:** Tokens appear as UUIDs in UI, decryption fails, can't retrieve actual token values

```typescript
// WRONG: Storing token directly
const { error } = await supabase
  .from('integrations')
  .insert({
    user_id: userId,
    access_token: tokens.access_token, // Plaintext token in DB!
  });

// RIGHT: Store Vault secret ID
const { data: secret } = await supabase.rpc('vault_create_secret', {
  secret: tokens.access_token,
  name: `google_access_${userId}`,
});

await supabase
  .from('integrations')
  .insert({
    user_id: userId,
    access_token: secret.id, // UUID reference to encrypted secret
  });
```

### Pitfall 5: Using UTC Offsets Instead of IANA Timezones

**What goes wrong:** Calendar events scheduled at wrong times after DST transitions
**Why it happens:** Storing UTC offset (-05:00) instead of IANA timezone (America/New_York), offset changes during DST
**How to avoid:** Always store IANA timezone names in user_profiles.timezone, use date-fns-tz for conversions
**Warning signs:** Events shift by 1 hour after DST change, different users in same city see different times

```typescript
// WRONG: UTC offset
await supabase
  .from('user_profiles')
  .update({ timezone: '-05:00' }); // Breaks during DST

// RIGHT: IANA timezone name
await supabase
  .from('user_profiles')
  .update({ timezone: 'America/New_York' }); // Handles DST automatically
```

### Pitfall 6: Calendar Creation Without User's Timezone

**What goes wrong:** New "Iron Life Man" calendar created with wrong timezone, events appear at incorrect times
**Why it happens:** Not setting timeZone when creating calendar, defaults to UTC
**How to avoid:** Fetch user's timezone from user_profiles before creating calendar, set in requestBody
**Warning signs:** Calendar shows UTC timezone in Google Calendar settings, events scheduled in wrong time

```typescript
// WRONG: No timezone specified
await calendar.calendars.insert({
  requestBody: {
    summary: 'Iron Life Man',
  },
});

// RIGHT: Use user's IANA timezone
const { data: profile } = await supabase
  .from('user_profiles')
  .select('timezone')
  .eq('id', userId)
  .single();

await calendar.calendars.insert({
  requestBody: {
    summary: 'Iron Life Man',
    timeZone: profile.timezone, // e.g., 'America/New_York'
  },
});
```

### Pitfall 7: Not Filtering for Writable Calendars

**What goes wrong:** User sees read-only calendars in selection dropdown, selects one, sync fails silently
**Why it happens:** Not using minAccessRole='writer' parameter in calendarList.list()
**How to avoid:** Always filter calendar list with minAccessRole='writer' to show only writable calendars
**Warning signs:** Event creation fails with 403 Forbidden, user reports "calendar connected but workouts don't appear"

```typescript
// WRONG: Returns all calendars including read-only
const { data } = await calendar.calendarList.list();

// RIGHT: Filter for write access
const { data } = await calendar.calendarList.list({
  minAccessRole: 'writer', // Only calendars user can modify
});
```

---

## Code Examples

Verified patterns from official sources:

### OAuth2Client Setup with All Security Best Practices
```typescript
// Source: https://developers.google.com/identity/protocols/oauth2/web-server
// lib/google/oauth-client.ts

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export function createOAuth2ClientInstance(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
}

export function generateAuthorizationUrl(oauth2Client: OAuth2Client, state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh_token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.calendarlist',
    ],
    state: state, // CSRF protection
    prompt: 'consent', // Force consent to ensure refresh_token
    include_granted_scopes: true, // Incremental authorization support
  });
}
```

### Complete OAuth Callback Handler
```typescript
// Source: https://github.com/googleapis/google-api-nodejs-client
// app/api/auth/google/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createOAuth2ClientInstance } from '@/lib/google/oauth-client';
import { storeGoogleTokens } from '@/app/actions/calendar/tokens';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth denial gracefully
  if (error === 'access_denied') {
    return NextResponse.redirect(new URL('/onboarding/plan-generation', request.url));
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;

  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/onboarding/calendar-connect?error=invalid_state', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/onboarding/calendar-connect?error=missing_code', request.url)
    );
  }

  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Exchange code for tokens
    const oauth2Client = createOAuth2ClientInstance();
    const { tokens } = await oauth2Client.getToken(code);

    // Store encrypted tokens
    await storeGoogleTokens(
      user.id,
      tokens.access_token!,
      tokens.refresh_token,
      new Date(tokens.expiry_date!).toISOString()
    );

    // Clean up state cookie
    cookieStore.delete('oauth_state');

    // Redirect to calendar selection
    return NextResponse.redirect(
      new URL('/onboarding/calendar-connect?step=select', request.url)
    );
  } catch (err) {
    console.error('OAuth error:', err);
    return NextResponse.redirect(
      new URL('/onboarding/calendar-connect?error=token_exchange', request.url)
    );
  }
}
```

### Supabase Vault Token Management
```typescript
// Source: https://supabase.com/docs/guides/database/vault
// app/actions/calendar/tokens.ts

'use server';

import { createServerClient } from '@/lib/supabase/server';

interface TokenData {
  access_token: string;
  refresh_token?: string | null;
  expiry_date: string;
}

export async function storeGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresAt: string
): Promise<void> {
  const supabase = await createServerClient();

  // Encrypt and store access token in Vault
  const { data: accessSecret, error: accessError } = await supabase.rpc(
    'vault_create_secret',
    {
      secret: accessToken,
      name: `google_access_${userId}`,
      description: 'Google Calendar access token',
    }
  );

  if (accessError) throw accessError;

  // Encrypt and store refresh token in Vault (if provided)
  let refreshSecretId = null;
  if (refreshToken) {
    const { data: refreshSecret, error: refreshError } = await supabase.rpc(
      'vault_create_secret',
      {
        secret: refreshToken,
        name: `google_refresh_${userId}`,
        description: 'Google Calendar refresh token',
      }
    );

    if (refreshError) throw refreshError;
    refreshSecretId = refreshSecret;
  }

  // Store metadata with Vault secret IDs (NOT the actual tokens)
  const { error: integrationError } = await supabase
    .from('integrations')
    .upsert(
      {
        user_id: userId,
        provider: 'google_calendar',
        access_token: accessSecret, // Vault secret UUID
        refresh_token: refreshSecretId, // Vault secret UUID
        token_expires_at: expiresAt,
        is_active: true,
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'connected',
      },
      {
        onConflict: 'user_id,provider',
      }
    );

  if (integrationError) throw integrationError;
}

export async function getGoogleTokens(userId: string): Promise<TokenData | null> {
  const supabase = await createServerClient();

  // Get integration record with Vault secret IDs
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) return null;

  // Retrieve decrypted tokens from Vault
  const secretIds = [integration.access_token, integration.refresh_token].filter(Boolean);

  const { data: secrets, error: vaultError } = await supabase
    .from('vault.decrypted_secrets')
    .select('id, decrypted_secret')
    .in('id', secretIds);

  if (vaultError) throw vaultError;

  const accessToken = secrets?.find(s => s.id === integration.access_token)?.decrypted_secret;
  const refreshToken = secrets?.find(s => s.id === integration.refresh_token)?.decrypted_secret;

  if (!accessToken) return null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(integration.token_expires_at).getTime(),
  };
}

export async function updateGoogleTokens(
  userId: string,
  tokens: Partial<TokenData>
): Promise<void> {
  const supabase = await createServerClient();

  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  // Update access token if provided
  if (tokens.access_token) {
    const { data: accessSecret } = await supabase.rpc('vault_update_secret', {
      secret_id: integration.access_token, // Update existing secret
      secret: tokens.access_token,
    });
    updates.token_expires_at = tokens.expiry_date;
  }

  // Update refresh token if provided (rare, usually null on refresh)
  if (tokens.refresh_token) {
    const { data: refreshSecret } = await supabase.rpc('vault_update_secret', {
      secret_id: integration.refresh_token,
      secret: tokens.refresh_token,
    });
  }

  await supabase
    .from('integrations')
    .update(updates)
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');
}
```

### Calendar List with Write Access Filter
```typescript
// Source: https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
// app/actions/calendar/calendars.ts

'use server';

import { getCalendarClient } from '@/lib/google/calendar-client';

interface Calendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

export async function listWritableCalendars(userId: string): Promise<Calendar[]> {
  const calendar = await getCalendarClient(userId);

  const { data } = await calendar.calendarList.list({
    minAccessRole: 'writer', // Only writable calendars (writer or owner)
    showDeleted: false,
    showHidden: false,
  });

  return (
    data.items?.map(cal => ({
      id: cal.id!,
      summary: cal.summary!,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
    })) || []
  );
}
```

### Create Calendar with User's Timezone
```typescript
// Source: https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
// app/actions/calendar/calendars.ts

export async function createIronLifeManCalendar(userId: string): Promise<Calendar> {
  const supabase = await createServerClient();
  const calendar = await getCalendarClient(userId);

  // Get user's IANA timezone
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('id', userId)
    .single();

  const timezone = profile?.timezone || 'America/New_York';

  // Create new calendar
  const { data } = await calendar.calendars.insert({
    requestBody: {
      summary: 'Iron Life Man',
      description: 'Triathlon training workouts managed by Iron Life Man',
      timeZone: timezone, // Use user's IANA timezone
    },
  });

  return {
    id: data.id!,
    summary: data.summary!,
    primary: false,
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OAuth 2.0 without PKCE | OAuth 2.1 with mandatory PKCE for public clients | RFC 9700 (2024) | Server-side apps (Next.js) don't need PKCE because client_secret is secure |
| pgsodium direct usage | Supabase Vault API | Supabase 2024 | Vault provides stable API while migrating internals, simpler secret management |
| API Routes (Pages Router) | Route Handlers (App Router) | Next.js 13.2+ | Route Handlers use Web APIs (Request/Response), better for OAuth callbacks |
| Client-side token storage (localStorage) | Server-side encrypted storage (Vault) | OWASP 2023 guidance | Client storage vulnerable to XSS, server-side encryption required for OAuth tokens |
| UTC-only timestamp storage | TIMESTAMPTZ with IANA timezones | PostgreSQL best practices 2024 | DST handling, historical accuracy, timezone rule changes |
| NextAuth.js for all OAuth | Custom Route Handlers for single provider | Next.js 14+ | NextAuth adds complexity for single provider, Route Handlers give more control |

**Deprecated/outdated:**
- **pgsodium direct API**: Being phased out as standalone, use Vault instead (Vault uses pgsodium internally)
- **Pages Router API Routes for OAuth**: Use App Router Route Handlers instead
- **Storing refresh tokens in cookies**: Security vulnerability, use server-side Vault storage
- **Manual token refresh logic**: googleapis OAuth2Client handles automatically with 'tokens' event

---

## Open Questions

### 1. Token Refresh Failure Handling Strategy

**What we know:**
- googleapis OAuth2Client automatically refreshes tokens when expiry_date approaches
- Refresh tokens can become invalid (user revokes access, 6 months inactive, password change)
- Library emits 'tokens' event on successful refresh

**What's unclear:**
- How to detect refresh failure vs. other API errors?
- Should we show user notification on refresh failure or just mark integration as "needs reconnection"?
- Should we retry failed refresh attempts?

**Recommendation:**
- Implement error handling in OAuth2Client creation: catch "invalid_grant" errors, mark integration as is_active=false
- Add connection status indicator to UI showing "needs reconnection"
- Don't automatically retry refresh failures (prevents infinite loops)
- Let user manually reconnect through settings

**Confidence:** MEDIUM - Error handling pattern is standard, but notification strategy depends on UX requirements

### 2. Calendar Switch Warning Implementation

**What we know:**
- User decision: "warn about existing events when switching calendars"
- Google Calendar API doesn't provide direct "count events in calendar" endpoint
- Could query events.list with timeMin/timeMax to check for existing workout events

**What's unclear:**
- Should we count ALL events in target calendar or just Iron Life Man events?
- Should we prevent switching if events exist or just warn?
- How far back/forward should we check for events?

**Recommendation:**
- Query events.list with timeMin=start_of_training_plan, timeMax=end_of_training_plan
- Filter for events created by our app (check for custom extendedProperties)
- Show count of existing workout events, allow switch with confirmation
- Switching doesn't delete old calendar events, just changes where new ones go

**Confidence:** HIGH - Pattern is straightforward, implementation in Phase 2 (calendar sync)

### 3. Vault Secret Update vs. Create for Token Refresh

**What we know:**
- Supabase Vault has vault.create_secret() and vault.update_secret()
- OAuth token refresh returns new access_token, may or may not return new refresh_token
- integrations table stores Vault secret UUID, not token value

**What's unclear:**
- Should we update existing Vault secret or create new one and update UUID reference?
- What happens to old secret when we create new one?
- Is there a vault.delete_secret() to clean up old tokens?

**Recommendation:**
- Use vault.update_secret() to update existing secret in-place (preserves UUID)
- Only create new secret on initial OAuth or if secret doesn't exist
- Reduces orphaned secrets in Vault
- Need to verify Vault API supports update_secret (create example shows update function exists)

**Confidence:** MEDIUM - Vault documentation shows update function exists, need to verify RPC wrapper

---

## Sources

### Primary (HIGH confidence)
- [OAuth 2.0 for Web Server Applications - Google](https://developers.google.com/identity/protocols/oauth2/web-server) - OAuth flow steps, endpoints, security
- [googleapis Node.js client - GitHub](https://github.com/googleapis/google-api-nodejs-client) - OAuth2Client usage, token refresh
- [Google Calendar API Auth Guide](https://developers.google.com/calendar/api/guides/auth) - Required scopes
- [CalendarList: list API Reference](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list) - minAccessRole parameter
- [Calendars: insert API Reference](https://developers.google.com/calendar/api/v3/reference/calendars/insert) - Create calendar
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault) - vault.create_secret(), encryption
- [Next.js 16 Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) - OAuth callback implementation
- [PostgreSQL TIMESTAMPTZ Documentation](https://www.postgresql.org/docs/current/datatype-datetime.html) - Timezone storage

### Secondary (MEDIUM confidence)
- [NextAuth.js OAuth Documentation](https://next-auth.js.org/configuration/providers/oauth) - Alternative pattern comparison
- [Auth.js Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation) - Token rotation patterns
- [Supabase Token Security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security) - RLS with OAuth
- [Next.js 16 Authentication (Auth0 Blog)](https://auth0.com/blog/whats-new-nextjs-16/) - Next.js 16 auth patterns
- [Database Timestamps and Timezones Best Practices](https://www.tinybird.co/blog/database-timestamps-timezones) - IANA timezone guidance
- [PostgreSQL Time Zone Management](https://www.cybertec-postgresql.com/en/time-zone-management-in-postgresql/) - PostgreSQL timezone handling

### Tertiary (LOW confidence)
- [NextStep - Onboarding Library](https://nextstepjs.com/) - Multi-step form patterns (alternative approach)
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - Community RLS patterns
- [Google Calendar API Overview](https://developers.google.com/calendar/api/guides/overview) - General API concepts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - googleapis is official library, Supabase Vault is official extension, Next.js Route Handlers are standard for App Router OAuth
- Architecture: HIGH - Patterns verified with official documentation, code examples from Google/Supabase docs
- Pitfalls: HIGH - Common issues documented in GitHub issues, Stack Overflow, official troubleshooting guides
- Token refresh: MEDIUM - Library handles automatically but failure scenarios need testing
- Vault implementation: MEDIUM - API is clear but RPC wrapper functions need to be created

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable ecosystem, OAuth 2.0 is mature standard)

**Notes:**
- googleapis library is at v128.0.0 in project, latest is v171.4.0 - consider upgrading for security patches
- Supabase Vault is stable API, internals may migrate from pgsodium but interface won't change
- Next.js 16 App Router patterns are current as of February 2026
- IANA timezone database updates regularly, date-fns-tz handles updates automatically
