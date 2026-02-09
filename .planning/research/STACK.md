# Stack Research

**Domain:** Ironman Training Scheduler - Google Calendar Integration + Drag-Drop Scheduling
**Researched:** 2026-02-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

For adding Google Calendar integration and drag-drop workout scheduling to an existing Next.js 16 + Supabase app, the recommended stack leverages already-installed packages (googleapis, @dnd-kit) with critical considerations around React 19 compatibility and OAuth token management patterns specific to Next.js App Router.

**Critical Finding:** @dnd-kit/core has React 19 compatibility concerns. The library has a newer @dnd-kit/react package (v0.2.4, actively maintained) that should be evaluated, or consider pragmatic-drag-and-drop as a proven alternative for React 19 projects.

## Recommended Stack

### Google Calendar Integration

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| googleapis | ^171.4.0 (latest: 128.0.0 installed) | Google Calendar API client | Official Google library with full Calendar v3 API support, actively maintained (updated 4 days ago as of Feb 2026), handles OAuth flows and all Calendar operations | HIGH |
| @googleapis/calendar | 14.2.0 (alternative) | Dedicated Calendar API client | Lighter alternative if only using Calendar API, but googleapis offers better integration across multiple Google services | MEDIUM |
| Next.js Server Actions | Built-in (Next.js 16) | OAuth callbacks, sync operations | Native Next.js 16 pattern for mutations, ideal for calendar sync operations and token refresh logic | HIGH |
| Next.js Route Handlers | Built-in (Next.js 16) | Webhook endpoints | App Router's API endpoint pattern (route.ts), required for Google Calendar push notification webhooks | HIGH |

### OAuth & Token Management

| Technology | Approach | Purpose | Why Recommended | Confidence |
|------------|----------|---------|-----------------|------------|
| Supabase Auth + Custom OAuth | Hybrid | Google Calendar OAuth flow | Leverage existing Supabase auth infrastructure while storing Google OAuth tokens separately in PostgreSQL | HIGH |
| Supabase PostgreSQL | Existing | OAuth token storage | Store Google access_token, refresh_token, expiry, and sync_token in dedicated table with RLS policies | HIGH |
| Middleware Token Refresh | Next.js middleware | Token lifecycle management | Follow Supabase SSR pattern: refresh tokens in middleware, pass via cookies to Server Components and browser | HIGH |

### Drag-and-Drop

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @dnd-kit/react | ^0.2.4 | Drag-drop interface | Newer React-optimized layer, actively maintained (updated 3 hours ago as of search), addresses React 19 compatibility concerns | MEDIUM |
| @dnd-kit/core | ^6.3.1 (installed) | Legacy fallback | Already installed, stable but last updated 1 year ago, has reported React 19 compatibility issues | MEDIUM-LOW |
| @dnd-kit/utilities | ^3.2.2 (installed) | Helper functions | arrayMove for reordering, compatible with either core or react packages | HIGH |
| pragmatic-drag-and-drop | ^1.x (alternative) | Drag-drop alternative | Atlassian's production-tested library (powers Trello/Jira), confirmed React 19 usage in production, framework-agnostic, performance-focused | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| date-fns | ^4.1.0 (installed) | Date manipulation | Already installed, use for workout date calculations and timezone handling with date-fns-tz | HIGH |
| date-fns-tz | ^2.0.0 (installed) | Timezone handling | Critical for Google Calendar sync across timezones, already in project | HIGH |
| zod | ^3.22.0 (installed) | Runtime validation | Validate webhook payloads, Calendar API responses, OAuth token schemas | HIGH |

## Installation

### If Using @dnd-kit/react (Recommended for React 19)

```bash
# Add the new React-optimized layer
npm install @dnd-kit/react@latest

# Already installed (verify compatibility)
# @dnd-kit/utilities@^3.2.2
# googleapis@^128.0.0 (consider upgrading to ^171.4.0)
```

### If Using pragmatic-drag-and-drop (Alternative)

```bash
# Core package
npm install @atlaskit/pragmatic-drag-and-drop

# React accessibility helpers (note: may not fully support React 19 yet)
npm install @atlaskit/pragmatic-drag-and-drop-react-accessibility

# Optional: Migration adapter if needed
npm install @atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration
```

### Database Schema Addition

```sql
-- Store Google Calendar OAuth tokens
CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Store Calendar sync state
CREATE TABLE calendar_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  sync_token TEXT,
  channel_id TEXT,
  channel_resource_id TEXT,
  channel_expiry TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, calendar_id)
);

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own tokens"
  ON google_calendar_tokens FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own sync state"
  ON calendar_sync_state FOR ALL
  USING (auth.uid() = user_id);
```

## Implementation Patterns

### Pattern 1: Google Calendar OAuth Flow (Next.js 16 App Router)

**Architecture:**
1. User clicks "Connect Google Calendar" → redirect to Google OAuth consent
2. Google redirects to callback Route Handler with authorization code
3. Route Handler exchanges code for tokens via googleapis
4. Store tokens in Supabase PostgreSQL (encrypted access_token, refresh_token)
5. Redirect to dashboard with success message

**Key Files:**
- `app/api/auth/google-calendar/route.ts` - Initial OAuth redirect
- `app/api/auth/google-calendar/callback/route.ts` - Handle OAuth callback
- `app/actions/calendar-sync.ts` - Server Actions for sync operations

**Example: OAuth Initiation**
```typescript
// app/api/auth/google-calendar/route.ts
import { google } from 'googleapis';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh_token
    scope: scopes,
    prompt: 'consent', // Force to get refresh_token every time
  });

  redirect(url);
}
```

**Rationale:**
- `access_type: 'offline'` ensures refresh_token is provided
- `prompt: 'consent'` forces consent screen to guarantee refresh_token
- Separate Route Handlers (not Server Actions) for OAuth redirects

**Confidence:** HIGH

### Pattern 2: Token Refresh Strategy

**Architecture:**
1. Middleware checks token expiry before protected routes
2. If expired, use refresh_token to get new access_token
3. Update PostgreSQL with new tokens
4. Pass refreshed token to Server Components via cookies (following Supabase SSR pattern)

**Implementation:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { google } from 'googleapis';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check if Google Calendar token needs refresh
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenData && new Date(tokenData.token_expiry) < new Date()) {
      // Token expired, refresh it
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: tokenData.refresh_token,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update database
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: credentials.access_token,
          token_expiry: new Date(credentials.expiry_date!),
          updated_at: new Date(),
        })
        .eq('user_id', user.id);
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/calendar/:path*'],
};
```

**Rationale:**
- Mirrors Supabase's own token refresh pattern in middleware
- Prevents Server Components from each trying to refresh simultaneously
- Handles refresh before protected routes execute

**Confidence:** HIGH

### Pattern 3: Google Calendar Webhook Sync

**Architecture:**
1. Initial sync: Call Calendar API with full sync, receive sync_token
2. Store sync_token in PostgreSQL calendar_sync_state table
3. Establish push notification channel (POST to /watch endpoint)
4. Store channel_id, resource_id, expiry in database
5. Webhook endpoint receives notifications when calendar changes
6. On notification: Call incremental sync API with sync_token
7. Update local workout data, get new sync_token, store it
8. Before channel expires (max 7 days): renew channel

**Implementation:**
```typescript
// app/api/webhooks/google-calendar/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const headersList = headers();
  const channelId = headersList.get('x-goog-channel-id');
  const resourceState = headersList.get('x-goog-resource-state');
  const channelToken = headersList.get('x-goog-channel-token');

  // Sync notification - confirm channel is active
  if (resourceState === 'sync') {
    return new NextResponse(null, { status: 200 });
  }

  // Validate token
  if (channelToken !== process.env.GOOGLE_WEBHOOK_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Exists notification - something changed
  if (resourceState === 'exists') {
    // Look up user and sync_token from channel_id
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for webhook
    );

    const { data: syncState } = await supabase
      .from('calendar_sync_state')
      .select('*, google_calendar_tokens(*)')
      .eq('channel_id', channelId)
      .single();

    if (!syncState) {
      return new NextResponse('Channel not found', { status: 404 });
    }

    // Perform incremental sync with sync_token
    // (implement sync logic here)

    return new NextResponse(null, { status: 200 });
  }

  return new NextResponse(null, { status: 200 });
}
```

**Google Calendar API Quotas to Consider:**
- **Daily limit:** 1,000,000 queries per day (generous for most apps)
- **Per-minute per-project:** Not publicly specified, but requires exponential backoff on 429/403 rateLimitExceeded
- **Per-minute per-user:** Prevents individual user spam
- **Best practices:**
  - Use push notifications instead of polling (already recommended above)
  - Implement exponential backoff for rate limit errors
  - Spread sync operations throughout the day, not at midnight
  - Use batch requests when fetching multiple events

**Rationale:**
- Webhook-based sync is real-time and quota-efficient
- Incremental sync with sync_token minimizes bandwidth and API calls
- Channel expiry requires renewal logic (background job or cron)
- Store channel metadata for webhook routing and validation

**Confidence:** MEDIUM-HIGH

### Pattern 4: Drag-Drop with @dnd-kit/react

**Architecture:**
1. DragDropProvider wraps weekly calendar view
2. Each workout is a Draggable component
3. Each calendar day/time slot is a Droppable component
4. On drop: update workout's scheduled_date and scheduled_time
5. Recalculate training load if workout moved to different day
6. Optimistic UI update, then Server Action to persist
7. If Google Calendar connected, sync change to Google

**Implementation (if using @dnd-kit/react):**
```typescript
'use client';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';

function WorkoutCard({ workout }: { workout: Workout }) {
  const { ref, draggableProps, isDragging } = useDraggable({
    id: workout.id,
    data: workout,
  });

  return (
    <div ref={ref} {...draggableProps} className={isDragging ? 'opacity-50' : ''}>
      {workout.title}
    </div>
  );
}

function DaySlot({ date, children }: { date: Date; children: React.ReactNode }) {
  const { ref, isOver } = useDroppable({
    id: date.toISOString(),
    data: { date },
  });

  return (
    <div ref={ref} className={isOver ? 'bg-blue-100' : ''}>
      {children}
    </div>
  );
}

function WeeklyCalendar({ workouts }: { workouts: Workout[] }) {
  const handleDragEnd = async (event: DragEndEvent) => {
    const workout = event.active.data as Workout;
    const targetDate = event.over?.data.date as Date;

    if (!targetDate) return;

    // Optimistic UI update
    // Then call Server Action
    await moveWorkout(workout.id, targetDate);
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      {/* Render calendar grid with DaySlot and WorkoutCard */}
    </DragDropProvider>
  );
}
```

**Accessibility Considerations (Critical for @dnd-kit):**
- Built-in keyboard navigation (Space to pick up, Arrow keys to move, Escape to cancel)
- Screen reader announcements for drag start, move, drop
- Focus management after drop
- ARIA live regions for status updates

**Rationale:**
- @dnd-kit/react is the newer API, actively maintained
- Framework-agnostic core means it works with Next.js App Router patterns
- Built-in accessibility features (keyboard nav, screen readers)
- Lightweight (~10kb core) for performance with many workouts

**Confidence:** MEDIUM (newer package, less community examples than @dnd-kit/core)

### Pattern 5: Drag-Drop with pragmatic-drag-and-drop (Alternative)

**Why Consider:**
- Confirmed production use at scale (Trello, Jira, Confluence)
- React 19 compatibility demonstrated in real-world apps
- Performance-focused with native HTML Drag and Drop API
- Framework-agnostic core enables future flexibility

**When to Use:**
- If @dnd-kit/react shows compatibility issues with React 19 in testing
- If team wants maximum performance and proven scale
- If future migration to other frameworks is possible

**Tradeoff:**
- Lower-level API requires more boilerplate
- Smaller community compared to @dnd-kit
- Some React-specific packages (react-accessibility) have React 19 issues

**Confidence:** HIGH for production readiness, MEDIUM for React 19 full ecosystem support

## Architecture Integration Patterns

### Next.js 16 App Router Integration

**Server Components for Calendar Views:**
- Fetch workout data and calendar state in Server Components
- Pass to Client Components for drag-drop interactivity
- Use Server Actions for mutations (move workout, sync to Google)

**Route Handlers for External APIs:**
- OAuth callbacks (GET /api/auth/google-calendar/callback)
- Webhook receivers (POST /api/webhooks/google-calendar)
- Explicit HTTP method control for REST patterns

**Middleware for Token Management:**
- Refresh expired Google Calendar tokens
- Follow Supabase SSR pattern: read cookies, refresh, write cookies
- Prevent race conditions in Server Components

**Confidence:** HIGH (official Next.js 16 patterns)

### Supabase Integration

**Database Tables:**
- `google_calendar_tokens` - OAuth access and refresh tokens
- `calendar_sync_state` - Sync tokens and channel metadata
- Existing `workouts` table - Add columns: `synced_to_google`, `google_event_id`

**Row Level Security:**
- Enforce user_id matching on all calendar tables
- Service role key only for webhook endpoint (bypasses RLS)

**Realtime (Optional):**
- Subscribe to workout table changes for live updates across tabs
- Useful if multiple users can view/edit same training plan

**Confidence:** HIGH (extends existing Supabase architecture)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Confidence |
|-------------|-------------|-------------------------|------------|
| googleapis | @googleapis/calendar | If only using Calendar API and want smaller bundle size | MEDIUM |
| @dnd-kit/react | @dnd-kit/core | If need maximum stability and don't need React 19 features | MEDIUM |
| @dnd-kit/react | pragmatic-drag-and-drop | If prioritize performance/scale over API simplicity, or @dnd-kit/react shows issues | HIGH |
| Push notifications | Polling with sync_token | If can't receive webhooks (firewall issues), fallback pattern | MEDIUM |
| Server Actions | Route Handlers | For OAuth callbacks and webhooks, use Route Handlers; for mutations called from components, use Server Actions | HIGH |

## What NOT to Use

| Avoid | Why | Use Instead | Confidence |
|-------|-----|-------------|------------|
| @dnd-kit/core with React 19 | Last updated 1 year ago, reported React 19 compatibility issues, no recent maintenance | @dnd-kit/react (actively maintained) or pragmatic-drag-and-drop | HIGH |
| react-beautiful-dnd | Deprecated by Atlassian in favor of pragmatic-drag-and-drop, no longer maintained | pragmatic-drag-and-drop or @dnd-kit/react | HIGH |
| NextAuth.js for Google Calendar OAuth | Adds complexity when Supabase Auth already in place, Calendar tokens need separate management anyway | Custom OAuth flow with googleapis + Supabase database for token storage | MEDIUM-HIGH |
| Polling for Calendar changes | Wastes quota (1M/day limit), slow to detect changes, inefficient | Push notifications with webhook channel | HIGH |
| Storing OAuth tokens in cookies | Security risk (XSS), size limits, no refresh token persistence | PostgreSQL with RLS policies | HIGH |
| Full sync on every webhook notification | Wastes bandwidth and quota, slow | Incremental sync with sync_token | HIGH |

## Stack Patterns by Variant

### If Building MVP (Fastest Path):
- Use @dnd-kit/core (already installed) if no React 19 issues observed in testing
- Skip push notifications initially, use periodic sync (every 15 min) with sync_token
- One-way sync: write workouts to Google Calendar, don't read conflicts back yet
- Manual "Refresh from Google" button instead of automatic conflict detection

**Rationale:** Reduces complexity of webhook setup and conflict resolution

### If Building Production (Full Features):
- Install @dnd-kit/react or pragmatic-drag-and-drop after testing with React 19
- Implement push notification webhooks for real-time sync
- Two-way sync: read work calendar conflicts, write workouts, handle collisions
- Background job to renew webhook channels before 7-day expiry
- Comprehensive error handling for quota limits and network failures

**Rationale:** Provides seamless user experience expected from production app

### If Prioritizing Accessibility:
- Use @dnd-kit/react with built-in accessibility features
- Or pragmatic-drag-and-drop-react-accessibility (check React 19 status)
- Ensure all drag-drop interactions have keyboard equivalents
- Test with screen readers (VoiceOver, NVDA)
- ARIA live regions for status announcements

**Rationale:** Makes training scheduler usable for athletes with disabilities

## Version Compatibility Matrix

| Package | Installed | Latest | React 19 Compatible? | Next.js 16 Compatible? | Notes |
|---------|-----------|--------|----------------------|------------------------|-------|
| googleapis | 128.0.0 | 171.4.0 | Yes | Yes | Consider upgrading, actively maintained |
| @dnd-kit/core | 6.3.1 | 6.3.1 | Questionable | Yes | Reported issues, last updated 1y ago |
| @dnd-kit/react | Not installed | 0.2.4 | Likely yes | Yes | Actively maintained, updated recently |
| @dnd-kit/utilities | 3.2.2 | 3.2.2 | Yes | Yes | Compatible with both core and react |
| pragmatic-drag-and-drop | Not installed | 1.x | Yes (proven) | Yes | Production-tested with React 19 |
| date-fns | 4.1.0 | 4.1.0 | Yes | Yes | Stable, no issues |
| date-fns-tz | 2.0.0 | 2.0.0 | Yes | Yes | Essential for timezone handling |

## Critical Implementation Notes

### Google Calendar API Rate Limits

**Quota Structure:**
- 1,000,000 queries/day (project-level)
- Per-minute per-project limit (unspecified, requires exponential backoff)
- Per-minute per-user limit (prevents individual abuse)

**Best Practices:**
1. **Use push notifications** - Most important optimization
2. **Implement exponential backoff** - Required for 429/403 errors
3. **Randomize sync timing** - Don't sync all users at midnight
4. **Batch requests** - Use Calendar API batch endpoints for bulk operations
5. **Test with low quotas** - Create test project with artificial limits to verify graceful degradation

**Monitoring:**
- Log quota errors to detect approaching limits
- Alert on rate limit errors
- Display user-friendly message if quota temporarily exceeded

**Confidence:** HIGH (official Google documentation)

### OAuth Token Security

**Storage Requirements:**
- Encrypt access_token and refresh_token at rest (Supabase handles this)
- Use RLS policies to prevent cross-user access
- Never expose tokens in client-side code or logs

**Refresh Token Persistence:**
- Google only provides refresh_token on first authorization or when `prompt: 'consent'` is used
- If refresh_token is lost, user must re-authorize
- Store refresh_token immediately, don't rely on keeping it in memory

**Scope Minimization:**
- Request only needed scopes: `calendar.readonly` for reading conflicts, `calendar.events` for writing workouts
- Don't request `calendar` (full access) unless absolutely necessary

**Confidence:** HIGH (security best practices)

### Webhook Channel Management

**Channel Lifecycle:**
- Maximum lifespan: 7 days (may be shorter based on Google's limits)
- No automatic renewal - must create new channel before expiry
- Store channel_id and expiry in database
- Background job (cron or database trigger) to renew 24h before expiry

**Channel Validation:**
- Use unique token per channel for verification
- Validate X-Goog-Channel-Token header matches stored value
- Return 200-level status codes to confirm receipt

**Failure Handling:**
- Webhooks are not 100% reliable (Google's documented limitation)
- Implement periodic fallback sync (e.g., hourly) in case webhook missed
- Log webhook failures for debugging

**Confidence:** MEDIUM-HIGH (documented patterns, some implementation complexity)

### Drag-Drop Performance

**Optimization Strategies:**
- Virtualize calendar view if showing >2 weeks of workouts
- Debounce drag position updates to reduce re-renders
- Use CSS transforms for drag preview (GPU-accelerated)
- Memoize draggable/droppable components

**Testing:**
- Test with 50+ workouts in view to verify performance
- Measure FPS during drag operations
- Test on mid-range mobile devices, not just desktop

**Accessibility:**
- Always provide keyboard alternative to drag-drop
- Test with keyboard-only navigation
- Test with screen reader (VoiceOver, NVDA, JAWS)

**Confidence:** HIGH (standard React performance patterns)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Confidence |
|------|------------|--------|------------|------------|
| @dnd-kit/core React 19 incompatibility | Medium | High | Test immediately, have pragmatic-drag-and-drop as backup plan | HIGH |
| Google Calendar API quota exceeded | Low | Medium | Implement push notifications (not polling), exponential backoff, user-facing quota warning | HIGH |
| Webhook channel expiry not renewed | Medium | Medium | Background job to renew 24h before expiry, fallback to periodic sync | MEDIUM |
| OAuth refresh token lost | Low | High | Always use `prompt: 'consent'`, store refresh_token immediately, user re-auth flow if lost | HIGH |
| Timezone handling bugs | Medium | Medium | Use date-fns-tz consistently, store all times in UTC, test across timezones | HIGH |
| Concurrent sync conflicts | Medium | Medium | Use sync_token for incremental sync, optimistic locking on workout updates, conflict resolution UI | MEDIUM |

## Sources

### Google Calendar Integration
- [Google Calendar API Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) - Official documentation on webhook setup
- [Google Calendar API Quotas](https://developers.google.com/workspace/calendar/api/guides/quota) - Official quota limits and best practices
- [Google Calendar API Sync Guide](https://developers.google.com/workspace/calendar/api/guides/sync) - Incremental sync with sync_token pattern
- [googleapis npm package](https://www.npmjs.com/package/googleapis) - Official Google API client library
- [Integrate NextJS Web Application with Google Calendar](https://javascript.plainenglish.io/nextjs-application-to-manage-your-google-calendar-and-your-invites-28dce1707b24) - Practical Next.js integration example
- [Google Calendar Webhooks with Node.js - Stateful](https://stateful.com/blog/google-calendar-webhooks) - Webhook implementation patterns

### Next.js 16 & OAuth
- [Next.js 16 Release](https://nextjs.org/blog/next-16) - Official App Router patterns and dynamic defaults
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Server-side token management with cookies
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google) - OAuth scope and refresh token configuration
- [Next.js Route Handlers Guide](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices) - Best practices for API routes in App Router

### Drag-Drop Libraries
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Comprehensive comparison
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) - Package details and version info
- [@dnd-kit/react npm](https://www.npmjs.com/package/@dnd-kit/react) - Newer React-optimized layer
- [pragmatic-drag-and-drop GitHub](https://github.com/atlassian/pragmatic-drag-and-drop) - Atlassian's production-tested library
- [pragmatic-drag-and-drop npm](https://www.npmjs.com/package/@atlaskit/pragmatic-drag-and-drop) - Package documentation
- [@dnd-kit Documentation](https://docs.dndkit.com) - Official API reference and guides
- [A Beginner's Guide to DnD Kit](https://dev.to/kelseyroche/a-beginners-guide-to-drag-and-drop-with-dnd-kit-in-react-5hfe) - Implementation tutorial

### React 19 Compatibility
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - React 19.2 integration
- [@dnd-kit React 19 Support Discussion](https://github.com/clauderic/dnd-kit/issues/801) - Community discussion on compatibility
- [pragmatic-drag-and-drop React 19 Issue](https://github.com/atlassian/pragmatic-drag-and-drop/issues/181) - Status of React 19 support

---
*Stack research for: Iron Life Man - Google Calendar Integration + Drag-Drop Scheduling*
*Researched: 2026-02-09*
