# Architecture Research

**Domain:** Calendar Integration + Drag-Drop Scheduling
**Researched:** 2026-02-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Client Layer (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Calendar │  │ Drag UI  │  │ Auth UI  │  │Dashboard │    │
│  │Component │  │Component │  │Component │  │  Pages   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │ useOptimistic│            │              │          │
│       └──────┬───────┴─────────────┴──────────────┘          │
├──────────────┴───────────────────────────────────────────────┤
│                  API Routes Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ OAuth Flow   │  │ Workout CRUD │  │Calendar Sync │       │
│  │ /api/oauth/  │  │ /api/workouts│  │/api/calendar │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
├─────────┴──────────────────┴──────────────────┴──────────────┤
│                  Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Plan Generation (lib/plan-generation/)             │    │
│  │  - Volume calculation                               │    │
│  │  - Workout generation                               │    │
│  │  - Phase progression                                │    │
│  └──────┬──────────────────────────────────────────────┘    │
│         │                                                    │
│  ┌──────┴───────────┐  ┌────────────────┐                   │
│  │ Calendar Service │  │ Load Calculator│                   │
│  │ (lib/calendar/)  │  │(lib/load-calc/)│                   │
│  └──────┬───────────┘  └────────┬───────┘                   │
├─────────┴─────────────────────────┴──────────────────────────┤
│                  Query/Data Access Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Queries    │  │Calendar Queue│  │ Auth Queries │       │
│  │lib/supabase/ │  │  (jobs table)│  │lib/supabase/ │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
├─────────┴──────────────────┴──────────────────┴──────────────┤
│                  Database Layer (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Workouts │  │Integrat- │  │ Profiles │  │Sync Jobs │    │
│  │  Table   │  │ions Table│  │  Table   │  │  Table   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│       (RLS enforced on all tables)                           │
└─────────────────────────────────────────────────────────────┘

External Services:
┌──────────────────┐
│ Google Calendar  │
│      API         │  ← Webhooks (push notifications)
└──────────────────┘  ← Periodic polling (fallback)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **OAuth Flow Handler** | Initiate Google OAuth, exchange code for tokens, store encrypted tokens | Next.js API routes (`/api/oauth/google/authorize`, `/api/oauth/google/callback`) |
| **Calendar Sync Service** | Read work calendar, write workouts, handle conflicts, process webhooks | Server-side module (`lib/calendar/sync.ts`) with Google Calendar API client |
| **Drag-Drop UI** | Visual calendar interface, optimistic updates, handle drag events | Client component with `useOptimistic` hook and drag library (dnd-kit or react-beautiful-dnd) |
| **Load Calculator** | Recalculate weekly training load when workouts move, validate schedule feasibility | Pure function module (`lib/load-calculator/`) called after workout mutations |
| **Sync Queue** | Track pending calendar operations, retry failed syncs, handle rate limits | Database table (`calendar_sync_jobs`) with cron/scheduled function processing |
| **Token Manager** | Refresh expired tokens, encrypt/decrypt tokens, revoke access | Module in `lib/calendar/tokens.ts` using Supabase Vault |

## Recommended Project Structure

```
app/
├── api/
│   ├── oauth/
│   │   ├── google/
│   │   │   ├── authorize/route.ts    # Initiate OAuth flow
│   │   │   └── callback/route.ts     # Handle OAuth callback
│   │   └── revoke/route.ts           # Revoke integration
│   ├── calendar/
│   │   ├── sync/route.ts             # Manual sync trigger
│   │   ├── webhook/route.ts          # Google webhook receiver
│   │   └── conflicts/route.ts        # Get/resolve conflicts
│   └── workouts/
│       └── [id]/
│           └── move/route.ts         # Drag-drop mutation endpoint
├── dashboard/
│   └── page.tsx                       # Existing dashboard (add calendar integration UI)
└── settings/
    └── integrations/
        └── page.tsx                   # OAuth connection UI

lib/
├── calendar/
│   ├── client.ts                      # Google Calendar API wrapper
│   ├── sync.ts                        # Sync logic (read/write operations)
│   ├── tokens.ts                      # Token refresh/encryption
│   ├── webhooks.ts                    # Webhook verification/processing
│   ├── conflicts.ts                   # Conflict detection/resolution
│   └── types.ts                       # Calendar-specific types
├── load-calculator/
│   ├── index.ts                       # Main calculator export
│   ├── weekly-load.ts                 # Calculate weekly totals
│   ├── constraints.ts                 # Validate schedule feasibility
│   └── redistribution.ts              # Smart workout redistribution
├── plan-generation/                   # [EXISTING]
│   ├── phases.ts                      # Phase calculations
│   ├── volume.ts                      # Volume ramping
│   ├── workouts.ts                    # Workout generation
│   └── constants.ts                   # Training constants
└── supabase/
    ├── queries.ts                     # [EXISTING] Add calendar query functions
    └── migrations/
        └── 002_calendar_integration.sql  # New tables/columns

types/
└── database.ts                        # [EXISTING] Add Integration types, CalendarEvent, SyncJob

components/
├── calendar/
│   ├── WorkoutCalendar.tsx           # Main calendar view with drag-drop
│   ├── WorkoutCard.tsx               # Draggable workout card
│   ├── CalendarDay.tsx               # Drop target
│   ├── ConflictModal.tsx             # Conflict resolution UI
│   └── SyncStatus.tsx                # Integration status indicator
└── integrations/
    ├── GoogleCalendarButton.tsx      # OAuth initiation
    └── IntegrationCard.tsx           # Integration management

```

### Structure Rationale

- **`lib/calendar/`**: Isolates all Google Calendar API logic; can be swapped for other providers (Outlook) without touching app routes
- **`lib/load-calculator/`**: Separates training load logic from plan generation; makes it reusable for drag-drop and API mutations
- **`api/oauth/`**: Centralizes OAuth flows; follows OAuth 2.0 best practices with PKCE
- **`api/calendar/`**: Dedicated calendar endpoints separate from workout CRUD; enables webhook receiver without mixing concerns
- **`components/calendar/`**: Reusable calendar UI components; drag-drop logic encapsulated

## Architectural Patterns

### Pattern 1: OAuth with Encrypted Token Storage

**What:** Store OAuth tokens encrypted in Supabase, refresh automatically before expiration

**When to use:** Any third-party integration requiring user authorization

**Trade-offs:**
- **Pros:** Secure token storage, automatic refresh, RLS enforced
- **Cons:** Additional latency for decryption, key management complexity

**Example:**
```typescript
// lib/calendar/tokens.ts
import { supabaseAdmin } from '@/lib/supabase/server';

export async function storeTokens(userId: string, tokens: OAuthTokens) {
  // Use Supabase Vault for encryption
  const { data, error } = await supabaseAdmin
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: 'google_calendar',
      access_token: tokens.access_token, // Vault encrypts automatically
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      is_active: true,
    }, {
      onConflict: 'user_id,provider'
    });

  if (error) throw error;
  return data;
}

export async function getValidToken(userId: string): Promise<string> {
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();

  if (!integration) throw new Error('No integration found');

  // Check expiration
  const expiresAt = new Date(integration.token_expires_at);
  if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) { // 5 min buffer
    return await refreshToken(userId, integration.refresh_token);
  }

  return integration.access_token;
}

async function refreshToken(userId: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  await storeTokens(userId, tokens);
  return tokens.access_token;
}
```

**Sources:**
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Google OAuth Token Security](https://developers.google.com/identity/protocols/oauth2/web-server#offline)

### Pattern 2: Optimistic UI with useOptimistic + Server Actions

**What:** Update UI immediately on drag, sync to server in background, rollback on failure

**When to use:** Interactive UI where user expects instant feedback (drag-drop, toggle actions)

**Trade-offs:**
- **Pros:** Feels instant, better UX, reduces perceived latency
- **Cons:** Requires rollback logic, can show transient state, more complex error handling

**Example:**
```typescript
// components/calendar/WorkoutCalendar.tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import { moveWorkout } from '@/app/actions/workouts';

export function WorkoutCalendar({ initialWorkouts }: { initialWorkouts: Workout[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticWorkouts, addOptimisticWorkout] = useOptimistic(
    initialWorkouts,
    (state, updatedWorkout: Workout) => {
      return state.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    }
  );

  const handleDrop = async (workoutId: string, newDate: Date, newTime: string) => {
    const workout = optimisticWorkouts.find(w => w.id === workoutId);
    if (!workout) return;

    // Update UI immediately
    addOptimisticWorkout({ ...workout, scheduled_date: newDate, scheduled_time: newTime });

    // Sync to server
    startTransition(async () => {
      try {
        await moveWorkout(workoutId, newDate, newTime);
      } catch (error) {
        // Rollback handled by React - state reverts to initialWorkouts
        toast.error('Failed to move workout. Changes reverted.');
      }
    });
  };

  return (
    <DndContext onDragEnd={handleDrop}>
      {optimisticWorkouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </DndContext>
  );
}
```

**Sources:**
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic)
- [Understanding Optimistic UI and React's useOptimistic Hook](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/)

### Pattern 3: Hybrid Sync (Webhooks + Polling Fallback)

**What:** Use Google Calendar webhooks for real-time updates, fallback to polling for reliability

**When to use:** Syncing with external calendar systems where 100% reliability is critical

**Trade-offs:**
- **Pros:** Real-time updates (98.5% reduction in polling), reliable fallback, handles webhook failures
- **Cons:** More complex setup, webhook endpoint management, requires cron for polling

**Example:**
```typescript
// lib/calendar/sync.ts
export async function setupWebhookSync(userId: string, calendarId: string) {
  const token = await getValidToken(userId);

  // Register webhook with Google Calendar
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/watch`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: `channel-${userId}`, // Unique channel ID
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_URL}/api/calendar/webhook`,
        expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      }),
    }
  );

  const channel = await response.json();

  // Store channel info for renewal
  await supabaseAdmin
    .from('integrations')
    .update({
      sync_settings: {
        channel_id: channel.id,
        resource_id: channel.resourceId,
        expires_at: channel.expiration,
      },
    })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');
}

// Fallback polling (runs every 15 minutes via cron)
export async function pollCalendarUpdates(userId: string) {
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('last_sync_at, calendar_id')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();

  const token = await getValidToken(userId);
  const syncToken = integration.last_sync_at; // Incremental sync

  // Fetch only changes since last sync
  const events = await fetchCalendarEvents(token, integration.calendar_id, syncToken);
  await processCalendarEvents(userId, events);
}
```

**Sources:**
- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Calendar Sync: Webhooks vs Polling Performance](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/)

### Pattern 4: Training Load Recalculation on Schedule Changes

**What:** Recalculate weekly training load when workouts are moved, validate against training plan constraints

**When to use:** After any workout mutation (drag-drop, reschedule, skip, complete)

**Trade-offs:**
- **Pros:** Maintains training plan integrity, prevents overtraining, provides instant feedback
- **Cons:** Additional computation on every mutation, may block drag-drop if slow

**Example:**
```typescript
// lib/load-calculator/weekly-load.ts
import { DISCIPLINE_RATIOS } from '@/lib/plan-generation/constants';

export interface WeeklyLoad {
  totalMinutes: number;
  swimMinutes: number;
  bikeMinutes: number;
  runMinutes: number;
  targetMinutes: number;
  percentOfTarget: number;
  isOverloaded: boolean; // Exceeds 120% of target
  isUnderloaded: boolean; // Below 80% of target
}

export function calculateWeeklyLoad(
  workouts: Workout[],
  targetHours: number
): WeeklyLoad {
  const swimMinutes = workouts
    .filter(w => w.discipline === 'swim' && w.status === 'scheduled')
    .reduce((sum, w) => sum + w.duration_minutes, 0);

  const bikeMinutes = workouts
    .filter(w => w.discipline === 'bike' && w.status === 'scheduled')
    .reduce((sum, w) => sum + w.duration_minutes, 0);

  const runMinutes = workouts
    .filter(w => w.discipline === 'run' && w.status === 'scheduled')
    .reduce((sum, w) => sum + w.duration_minutes, 0);

  const totalMinutes = swimMinutes + bikeMinutes + runMinutes;
  const targetMinutes = targetHours * 60;
  const percentOfTarget = (totalMinutes / targetMinutes) * 100;

  return {
    totalMinutes,
    swimMinutes,
    bikeMinutes,
    runMinutes,
    targetMinutes,
    percentOfTarget,
    isOverloaded: percentOfTarget > 120,
    isUnderloaded: percentOfTarget < 80,
  };
}

// lib/load-calculator/constraints.ts
export function validateWorkoutMove(
  workout: Workout,
  targetDate: Date,
  allWorkouts: Workout[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Get workouts for target week
  const weekStart = getWeekStartDate(targetDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekWorkouts = allWorkouts.filter(w => {
    const date = new Date(w.scheduled_date);
    return date >= weekStart && date < weekEnd && w.id !== workout.id;
  });

  // Simulate the move
  const simulatedWorkouts = [...weekWorkouts, { ...workout, scheduled_date: targetDate }];
  const load = calculateWeeklyLoad(simulatedWorkouts, workout.user_target_hours);

  if (load.isOverloaded) {
    warnings.push(`Moving this workout would exceed weekly target by ${(load.percentOfTarget - 100).toFixed(0)}%`);
  }

  // Check for same-day discipline conflicts
  const sameDayWorkouts = weekWorkouts.filter(w =>
    isSameDay(new Date(w.scheduled_date), targetDate)
  );

  const hasSameDiscipline = sameDayWorkouts.some(w => w.discipline === workout.discipline);
  if (hasSameDiscipline) {
    warnings.push(`You already have a ${workout.discipline} workout on this day`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
```

**Integration with drag-drop:**
```typescript
// app/actions/workouts.ts
'use server';

export async function moveWorkout(workoutId: string, newDate: Date, newTime: string) {
  const user = await requireAuth();
  const supabase = await getSupabaseClient();

  // Get workout and validate ownership
  const workout = await getWorkout(workoutId, supabase);
  if (!workout || workout.user_id !== user.id) {
    throw new Error('Workout not found');
  }

  // Get all workouts for load calculation
  const allWorkouts = await getWorkouts(user.id, undefined, supabase);

  // Validate move
  const validation = validateWorkoutMove(workout, newDate, allWorkouts);
  if (!validation.valid) {
    throw new Error(validation.warnings.join('; '));
  }

  // Update workout
  const updated = await updateWorkout(
    workoutId,
    { scheduled_date: newDate, scheduled_time: newTime },
    supabase
  );

  // Trigger calendar sync if integration active
  const profile = await getProfile(user.id, supabase);
  if (profile.google_access_token) {
    await queueCalendarSync(user.id, 'update', workoutId);
  }

  // Recalculate weekly load for analytics
  const weekLoad = calculateWeeklyLoad(
    allWorkouts.map(w => w.id === workoutId ? updated : w),
    profile.target_hours_per_week
  );

  // Could store weekly load in analytics table for tracking

  revalidatePath('/dashboard');
  return updated;
}
```

**Sources:**
- [Training Load Calculation Algorithms](https://forum.intervals.icu/t/training-load-calculation/423)
- [Garmin Training Load Guide](https://runningwithrock.com/garmin-training-load/)

## Data Flow

### OAuth Flow

```
1. User clicks "Connect Google Calendar" on /settings/integrations
   ↓
2. Client redirects to /api/oauth/google/authorize
   ↓
3. API route generates PKCE code_verifier + code_challenge, stores in session
   ↓
4. Redirects to Google OAuth consent screen with:
   - client_id
   - redirect_uri: /api/oauth/google/callback
   - scope: calendar.readonly calendar.events
   - code_challenge (PKCE)
   ↓
5. User approves permissions
   ↓
6. Google redirects to /api/oauth/google/callback with authorization code
   ↓
7. API route exchanges code for tokens using code_verifier
   ↓
8. Store encrypted tokens in integrations table (Supabase Vault)
   ↓
9. Set up Google Calendar webhook subscription
   ↓
10. Store channel_id and expiration in sync_settings JSONB
   ↓
11. Redirect to /settings/integrations with success message
   ↓
12. Trigger initial calendar sync to read work events
```

### Calendar Sync Flow (Bidirectional)

```
READ (Work Calendar → Iron Life Man):
1. Cron job runs every 15 min (fallback) OR webhook received from Google
   ↓
2. Fetch calendar events since last_sync_at (incremental sync)
   ↓
3. Filter events: is_all_day=false, status=confirmed, start_time exists
   ↓
4. Detect conflicts: event overlaps with scheduled workout
   ↓
5. Store conflicts in calendar_conflicts table with status=pending
   ↓
6. Send notification to user about conflicts
   ↓
7. User resolves conflict (move workout, ignore, cancel workout)
   ↓
8. Update last_sync_at timestamp

WRITE (Workouts → Google Calendar):
1. User completes onboarding OR moves/creates workout via drag-drop
   ↓
2. Insert job into calendar_sync_jobs table:
   - job_type: 'create' | 'update' | 'delete'
   - workout_id: workout to sync
   - status: 'pending'
   ↓
3. Cron job processes queue every 5 minutes
   ↓
4. For each pending job:
   a. Get valid access token (refresh if expired)
   b. Call Google Calendar API:
      - Create: POST /calendars/{calendarId}/events
      - Update: PATCH /calendars/{calendarId}/events/{eventId}
      - Delete: DELETE /calendars/{calendarId}/events/{eventId}
   c. Store event_id in workouts.calendar_event_id
   d. Update job status: 'completed' | 'failed'
   e. On failure: increment retry_count, schedule retry with exponential backoff
   ↓
5. Mark job as completed, update last_sync_at
```

### Drag-Drop Flow with Optimistic Updates

```
1. User drags WorkoutCard to new CalendarDay
   ↓
2. onDragEnd handler fires with { workoutId, newDate, newTime }
   ↓
3. Client: addOptimisticWorkout({ ...workout, scheduled_date: newDate })
   → UI updates IMMEDIATELY
   ↓
4. Client: calls moveWorkout(workoutId, newDate, newTime) server action
   ↓
5. Server: requireAuth(), validate ownership
   ↓
6. Server: fetch all workouts for load calculation
   ↓
7. Server: validateWorkoutMove(workout, newDate, allWorkouts)
   → Check weekly load, discipline conflicts
   ↓
8. If invalid: throw error → client reverts optimistic state
   ↓
9. Server: updateWorkout() in database
   ↓
10. Server: queueCalendarSync('update', workoutId)
    → Adds job to calendar_sync_jobs table
   ↓
11. Server: revalidatePath('/dashboard')
    → Next.js invalidates cached data
   ↓
12. Server: return updated workout
   ↓
13. Client: transition completes, optimistic state replaced with server state
   ↓
14. Background: Cron processes calendar_sync_jobs queue
    → Updates Google Calendar event
```

### State Management

| State Type | Storage | Access Pattern | Update Pattern |
|------------|---------|----------------|----------------|
| **Workout Schedule** | Supabase `workouts` table | Server Component fetch via `getWorkouts()` | Server Action `moveWorkout()` + revalidatePath |
| **Optimistic UI** | React `useOptimistic` hook | Client component local state | Immediate on drag, replaced by server state on completion |
| **OAuth Tokens** | Supabase `integrations` table (Vault-encrypted) | Server-only via `getValidToken()` | Auto-refresh before expiration |
| **Sync Queue** | Supabase `calendar_sync_jobs` table | Cron/Edge Function polling | Insert on workout mutation, update on job completion |
| **Conflicts** | Supabase `calendar_conflicts` table | Server Component fetch | User resolution action |
| **Weekly Load** | Calculated on-demand | Pure function in Server Action | Recalculated after every workout mutation |

## Integration Points with Existing Architecture

### Where OAuth Flow Lives

**Recommendation:** API routes (`app/api/oauth/`)

**Rationale:**
- OAuth requires server-side secret (client_secret) that cannot be exposed to browser
- Need to handle redirects and token exchange securely
- Fits existing API route pattern (e.g., `/api/onboarding`, `/api/workouts/[id]/complete`)
- Can use `requireAuth()` middleware consistently

**Integration:**
```typescript
// app/api/oauth/google/authorize/route.ts
import { requireAuth } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  const user = await requireAuth(); // Reuse existing auth pattern
  // ... OAuth flow
}
```

### Token Storage Security

**Recommendation:** Supabase Vault encryption on `integrations` table

**Rationale:**
- Existing `integrations` table already has `access_token`, `refresh_token` columns
- Supabase Vault provides authenticated encryption (libsodium) with automatic signing
- RLS already enforced on `integrations` table (`user_id` column)
- No KMS setup required (Supabase Cloud handles keys)

**Migration:**
```sql
-- Enable Vault extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Vault encrypts data at rest; access through queries remains the same
-- Existing RLS policies continue to work
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
```

**Sources:**
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Token Security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)

### Drag-Drop State Management

**Recommendation:** Client component with `useOptimistic` + Server Actions

**Rationale:**
- Next.js 16 App Router prioritizes Server Components; client interaction at leaf nodes
- `useOptimistic` is React 19's built-in solution for optimistic updates
- Server Actions provide type-safe RPC without manual API route creation
- Fits existing pattern: dashboard is Server Component, calendar can be client component

**Integration:**
```
app/dashboard/page.tsx (Server Component)
  ├── Fetches workouts via getWorkouts(user.id)
  ├── Passes workouts as prop to client component
  └── <WorkoutCalendar workouts={workouts} />  // 'use client'
        └── useOptimistic + moveWorkout() Server Action
```

**Sources:**
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

### Calendar Sync with Existing Queries

**Recommendation:** Extend `lib/supabase/queries.ts` with calendar functions

**Rationale:**
- Existing queries already provide `createProfile()`, `getWorkouts()`, `updateWorkout()`
- Calendar sync needs these same functions, plus conflict detection
- Keeps database access layer centralized

**New functions to add:**
```typescript
// lib/supabase/queries.ts

export async function getCalendarIntegration(userId: string) {
  // Returns integration with decrypted tokens
}

export async function getWorkoutsForSync(userId: string, startDate: Date, endDate: Date) {
  // Fetch workouts needing calendar sync
}

export async function queueCalendarSync(userId: string, jobType: string, workoutId: string) {
  // Insert into calendar_sync_jobs
}

export async function detectConflicts(userId: string, calendarEvents: CalendarEvent[]) {
  // Cross-reference work events with workout schedule
}
```

### Training Load Recalculation Timing

**Recommendation:** Calculate on-demand during workout mutations, not stored

**Rationale:**
- Load depends on dynamic data (scheduled workouts, skipped workouts, target hours)
- Calculation is fast (sum minutes by discipline, compare to target)
- Storing would require triggers/webhooks to keep in sync
- Follow YAGNI: calculate when needed (drag-drop validation, dashboard display)

**Integration:**
```typescript
// app/actions/workouts.ts (Server Action)
export async function moveWorkout(workoutId: string, newDate: Date, newTime: string) {
  // 1. Fetch all workouts
  const allWorkouts = await getWorkouts(user.id);

  // 2. Validate move (calculates load internally)
  const validation = validateWorkoutMove(workout, newDate, allWorkouts);

  // 3. Update workout
  const updated = await updateWorkout(workoutId, { scheduled_date: newDate });

  // 4. Return updated workout (client updates UI)
  return updated;
}
```

**When to recalculate:**
- Before drag-drop mutation (validation)
- After workout complete/skip (dashboard stats update)
- Dashboard page load (show current week stats)

**Sources:**
- [Training Load Calculation](https://forum.intervals.icu/t/training-load-calculation/423)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Current architecture sufficient. OAuth flow in API routes, webhook receiver in API route, cron via Vercel Cron or Supabase scheduled functions (every 5-15 min). Supabase free tier supports 500 MB database, 50k MAU auth. |
| **1k-10k users** | Move sync queue processing to dedicated Edge Function (better concurrency). Add Redis cache for active tokens (reduce Vault decryption latency). Batch calendar API calls (Google allows 50 requests/sec per project). Add rate limiting to webhook endpoint (DDoS protection). |
| **10k-100k users** | Horizontal scaling: queue workers in separate processes (Supabase Edge Functions or AWS Lambda). Implement sync priority queue (active users first). Add webhook deduplication (Google sometimes sends duplicates). Consider calendar event cache in Redis (reduce API calls). Add observability (Sentry, DataDog) for sync failures. |

### Scaling Priorities

1. **First bottleneck:** Calendar API rate limits (50 req/sec/project)
   - **Fix:** Batch requests, implement exponential backoff, use push notifications instead of polling
   - **When:** ~5k active integrations making frequent syncs

2. **Second bottleneck:** Webhook processing latency (single API route handler)
   - **Fix:** Queue webhook events for async processing, deduplicate events, use Edge Functions for parallelism
   - **When:** ~10k active webhook subscriptions, high update frequency

3. **Third bottleneck:** Token refresh concurrency (multiple requests refreshing same token)
   - **Fix:** Implement distributed lock (Redis), cache refreshed tokens (5 min TTL), single refresh per token
   - **When:** ~20k users with active integrations

## Anti-Patterns

### Anti-Pattern 1: Storing Calendar Events in Database

**What people do:** Sync calendar events to local database table for querying

**Why it's wrong:**
- Doubles storage requirements
- Creates data consistency issues (Google Calendar is source of truth)
- Requires complex sync logic to handle updates/deletes
- Adds latency to every calendar operation (write to DB + write to Google)

**Do this instead:**
- Fetch calendar events on-demand when needed (conflict detection)
- Cache in Redis/memory for duration of request
- Store only the minimal reference (`calendar_event_id` on workouts table)
- Let Google Calendar API be the query layer for calendar data

### Anti-Pattern 2: Synchronous Calendar Sync on Workout Mutations

**What people do:** Call Google Calendar API directly in drag-drop handler or API route

**Why it's wrong:**
- Blocks user interaction on external API latency (200-500ms)
- No retry mechanism if Google API is down
- Rate limiting affects user experience directly
- OAuth token refresh can add 1-2 seconds

**Do this instead:**
- Use optimistic UI updates (instant feedback)
- Queue calendar sync jobs in database
- Process queue asynchronously (cron/worker)
- Return success to user immediately, handle sync in background
- Show sync status indicator for transparency

### Anti-Pattern 3: Polling Google Calendar Every Minute

**What people do:** Set up aggressive polling (every 1-5 min) to catch calendar changes quickly

**Why it's wrong:**
- Wastes API quota (50 requests/sec shared across all users)
- Costs $$$$ at scale (Google Calendar API pricing after free tier)
- Most polls return no changes (wasted requests)
- Adds server load for minimal benefit

**Do this instead:**
- Use Google Calendar push notifications (webhooks)
- Polling as fallback only (every 15-30 min)
- Implement incremental sync with `syncToken` (only fetch changes)
- Track `last_sync_at` to avoid re-syncing same data

**Sources:**
- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Calendar Sync: 66x Performance Improvement](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/)

### Anti-Pattern 4: Recalculating Training Load on Every Page Load

**What people do:** Run complex load calculation on every dashboard render

**Why it's wrong:**
- Unnecessary computation (data rarely changes)
- Slows page load (blocking calculation)
- Scales poorly (O(n) where n = number of workouts)

**Do this instead:**
- Calculate load only when workouts change (mutation time)
- Use React Server Components to calculate once on server
- Cache calculation result for duration of request
- Store aggregate stats if querying frequently (denormalize for reads)

**Example:**
```typescript
// app/dashboard/page.tsx (Server Component)
export default async function Dashboard() {
  const user = await requireAuth();
  const profile = await getProfile(user.id);
  const currentWeek = getCurrentWeekNumber(profile.race_date);
  const workouts = await getWorkouts(user.id, { weekNumber: currentWeek });

  // Calculate once on server, pass as prop
  const weeklyLoad = calculateWeeklyLoad(workouts, profile.target_hours_per_week);

  return (
    <DashboardLayout>
      <WeeklyLoadCard load={weeklyLoad} /> {/* Static rendering, no recalc */}
      <WorkoutCalendar workouts={workouts} /> {/* Client component for drag-drop */}
    </DashboardLayout>
  );
}
```

## Build Order Recommendations

Based on component dependencies, recommended build sequence:

### Phase 1: OAuth Foundation (No drag-drop yet)
**Goal:** Get OAuth working, store tokens securely

1. Database migration: Add `integrations` table columns (if not present), enable Vault
2. Create `/api/oauth/google/authorize` and `/api/oauth/google/callback` routes
3. Build `lib/calendar/tokens.ts` (store/refresh/validate tokens)
4. Add "Connect Google Calendar" button on settings page
5. Test OAuth flow end-to-end (authorize → callback → tokens stored)

**Validation:** Can successfully connect Google Calendar, tokens stored encrypted

### Phase 2: Calendar Sync (Write Only)
**Goal:** Write workouts to Google Calendar

1. Build `lib/calendar/client.ts` (Google Calendar API wrapper)
2. Create `lib/calendar/sync.ts` (create/update/delete event functions)
3. Add `calendar_sync_jobs` table
4. Create `lib/supabase/queries.ts::queueCalendarSync()`
5. Build queue processor (cron/Edge Function)
6. Hook into existing workout mutations (onboarding, complete, reschedule)

**Validation:** Workouts appear in Google Calendar after onboarding/mutations

### Phase 3: Webhook Setup (Read Calendar)
**Goal:** Detect conflicts with work calendar

1. Create `/api/calendar/webhook` route (verify Google signature)
2. Build `lib/calendar/webhooks.ts` (setup/renew channel)
3. Add channel setup to OAuth callback flow
4. Create `calendar_conflicts` table
5. Build conflict detection logic in `lib/calendar/conflicts.ts`
6. Add conflict UI on dashboard (read-only, just show conflicts)

**Validation:** Work events detected, conflicts shown on dashboard

### Phase 4: Drag-Drop UI
**Goal:** Move workouts visually

1. Choose drag-drop library (dnd-kit recommended for Next.js)
2. Build `components/calendar/WorkoutCalendar.tsx` (client component)
3. Add drag handlers with `useOptimistic`
4. Create `app/actions/workouts.ts::moveWorkout()` Server Action
5. Integrate with calendar sync queue (queue 'update' job on move)
6. Add load validation in Server Action

**Validation:** Can drag workout to new day, UI updates instantly, syncs to Google Calendar

### Phase 5: Load Calculation & Validation
**Goal:** Prevent overtraining on drag

1. Build `lib/load-calculator/weekly-load.ts`
2. Build `lib/load-calculator/constraints.ts` (validation logic)
3. Hook validation into `moveWorkout()` Server Action (before mutation)
4. Add warning UI on drag (show load impact before confirming)
5. Add weekly load card to dashboard

**Validation:** Cannot move workout if it exceeds 120% weekly load

### Phase 6: Conflict Resolution UI
**Goal:** User can resolve conflicts

1. Build `components/calendar/ConflictModal.tsx`
2. Add conflict resolution actions (move/ignore/cancel)
3. Update `lib/calendar/conflicts.ts` with resolution logic
4. Hook resolution actions to sync queue

**Validation:** User can resolve conflict, workout moves/syncs correctly

### Dependency Graph

```
Phase 1 (OAuth) → Phase 2 (Write Sync) → Phase 4 (Drag-Drop)
                                            ↓
Phase 1 (OAuth) → Phase 3 (Webhooks) → Phase 6 (Conflict Resolution)
                                            ↑
                  Phase 5 (Load Calc) ──────┘
```

**Critical path:** OAuth → Write Sync → Drag-Drop (core functionality)

**Parallel work:** Phase 5 (Load Calculator) can be built alongside Phase 3/4

## Security Considerations

### Token Storage

- **Use Supabase Vault:** Automatic encryption/decryption, authenticated encryption (libsodium), keys managed by Supabase Cloud
- **Never log tokens:** Redact `access_token`/`refresh_token` in logs/errors
- **Server-only access:** Tokens never sent to client; all calendar operations via API routes/Server Actions
- **RLS enforcement:** `integrations` table RLS policy: `user_id = auth.uid()`

**Sources:**
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [OAuth Token Security Best Practices](https://supabase.com/docs/guides/auth/oauth-server/token-security)

### Authorization

- **requireAuth() on all endpoints:** Reuse existing pattern from API routes
- **Validate workout ownership:** `workout.user_id === user.id` before mutations
- **Webhook verification:** Verify Google signature on webhook endpoint (prevent spoofing)
- **PKCE for OAuth:** Use Proof Key for Code Exchange (prevents authorization code interception)

**Example webhook verification:**
```typescript
// app/api/calendar/webhook/route.ts
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-goog-channel-token');
  const body = await request.text();

  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process webhook
}
```

**Sources:**
- [Google Calendar Webhook Security](https://developers.google.com/calendar/api/guides/push#receiving-notifications)

### Rate Limiting

- **API route protection:** Use Vercel rate limiting or Upstash Redis
- **Calendar API quotas:** Google Calendar API: 1M requests/day, 50 requests/sec/project
- **Exponential backoff:** Retry failed requests with 2^n delay
- **User-level throttling:** Limit drag-drop mutations (debounce 500ms)

### Environment Variables

**Required secrets:**
```env
# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx  # Server-only, never expose

# Webhook
WEBHOOK_SECRET=xxx  # For signature verification

# Supabase
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx  # Client-safe
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-only, bypasses RLS

# App
NEXT_PUBLIC_URL=https://app.example.com  # For OAuth redirect_uri
```

## Sources

### OAuth & Authentication
- [Next.js Google OAuth Integration](https://clerk.com/blog/nextjs-google-authentication)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Calendar API Node.js Quickstart](https://developers.google.com/calendar/api/quickstart/nodejs)
- [Google OAuth 2.0 Guide](https://nextnative.dev/blog/google-oauth-2-0)

### Token Storage & Security
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Token Security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)
- [Supabase Security Best Practices](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide)
- [Sensitive Data Encryption with Supabase](https://medium.com/@yogeshmulecraft/sensitive-data-encryption-with-supabase-77737d0871e8)

### Calendar Sync
- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Calendar Webhook Integration Guide](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/)
- [Implementing Calendar Sync](https://www.ensolvers.com/post/implementing-calendar-synchronization-with-google-calendar-api)
- [Google Calendar API Essentials](https://rollout.com/integration-guides/google-calendar/api-essentials)

### Optimistic UI & State Management
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic)
- [Understanding Optimistic UI](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [React 19 useOptimistic Breakdown](https://dev.to/dthompsondev/react-19-useoptimistic-hook-breakdown-5g9k)

### Training Load
- [Training Load Calculation](https://forum.intervals.icu/t/training-load-calculation/423)
- [Garmin Training Load Guide](https://runningwithrock.com/garmin-training-load/)
- [Training Load: What It Is and How to Measure](https://www.runnersworld.com/training/a61499738/training-load/)
- [Training Load Calculator 2026](https://runbikecalc.com/training-load-calculator)

### Drag-and-Drop
- [DayPilot Next.js Calendar](https://code.daypilot.org/45330/next-js-weekly-calendar-open-source)
- [10 Best Drag and Drop Libraries for React](https://reactscript.com/best-drag-drop/)
- [dnd-kit (Recommended)](https://dndkit.com/)

### Next.js 16 Architecture
- [Next.js 2026 Best Practices](https://www.serviots.com/blog/nextjs-development-best-practices)
- [Next.js Latest Features 2026](https://dev.to/bishoy_semsem/nextjs-is-evolving-fast-10-latest-features-you-cant-ignore-in-2026-1hcd)
- [React Fundamentals 2026](https://www.nucamp.co/blog/react-fundamentals-in-2026-components-hooks-react-compiler-and-modern-ui-development)

---
*Architecture research for: Calendar Integration + Drag-Drop Scheduling*
*Researched: 2026-02-09*
