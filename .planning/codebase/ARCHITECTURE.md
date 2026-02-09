# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** Server-Component-Driven Full-Stack with Plan Generation Engine

This is a Next.js 16 application using the App Router that combines:
- **Server-side rendering** for page composition and data fetching
- **Supabase Row-Level Security (RLS)** for data isolation
- **Client-side state management** for forms and UI interactions
- **Plan generation algorithm** that calculates progressive training phases
- **API routes** for asynchronous workout operations

**Key Characteristics:**
- Separation of concerns between plan generation (lib), data access (queries), UI (components), and pages
- Type-safe database layer with explicit Row/Entity type mappings
- Authentication-first architecture with requireAuth guards
- Progressive workout generation (3 weeks initially, weekly generation after)
- Modular phase-based training plan structure

## Layers

**Presentation Layer (UI/Components):**
- Purpose: Render user interfaces and handle client-side interactions
- Location: `app/`, `components/`
- Contains: React components, page routes, server components
- Depends on: Queries (for data), Auth (for user info), Types (for TypeScript)
- Used by: Browser clients, Next.js router

**API Layer (Backend Routes):**
- Purpose: Handle asynchronous operations, enforce authorization, coordinate business logic
- Location: `app/api/`
- Contains: POST/route handlers for workouts, onboarding, integrations
- Depends on: Auth (requireAuth), Queries (data access), Plan Generation (algorithms)
- Used by: Client-side fetch calls, external integrations

**Query/Data Access Layer:**
- Purpose: Encapsulate database operations and provide consistent data transformation
- Location: `lib/supabase/queries.ts`
- Contains: CRUD operations for profiles, workouts, with RLS enforcement
- Depends on: Supabase client, Types (database types)
- Used by: API routes, Server Components, Plan generation

**Authentication Layer:**
- Purpose: Manage user sessions and provide auth utilities
- Location: `lib/supabase/auth.ts`
- Contains: getUser(), requireAuth(), getSupabaseClient(), getSession()
- Depends on: Supabase server client
- Used by: Pages, API routes for access control

**Business Logic Layer (Plan Generation):**
- Purpose: Calculate training phases, volumes, and workout schedules
- Location: `lib/plan-generation/`
- Contains: Phase calculations, volume ramping, workout template generation
- Depends on: Constants, Types
- Used by: API routes (onboarding), Queries (profile management)

**Database Client Layer:**
- Purpose: Provide Supabase client instances
- Location: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Contains: Supabase initialization with environment credentials
- Depends on: Environment variables, @supabase/supabase-js
- Used by: Auth layer, Query layer

**Type Definitions:**
- Purpose: Define database schemas, enums, and API contracts
- Location: `types/database.ts`
- Contains: Profile, Workout, Race, Integration types with Row variants for DB mapping
- Used by: All layers for type safety

## Data Flow

**User Registration & Onboarding Flow:**

1. User navigates to `/signup` (client component) → enters email/password
2. Client calls Supabase auth directly via `createClient()`
3. User redirected to `/onboarding` flow (multi-step pages)
4. User provides: race_date, fitness_level, target_hours, workout times, timezone
5. Client submits to `POST /api/onboarding` with onboarding data
6. API route:
   - Calls `requireAuth()` to verify user session
   - Creates profile via `createProfile()` which:
     - Inserts into `user_profiles` (timezone)
     - Inserts into `races` (race_date, status='upcoming')
     - Inserts into `training_preferences` (fitness_level, hours, times, linked to race)
     - Optionally inserts into `integrations` (Google Calendar if provided)
   - Calculates phases via `calculatePhases(race_date)`
   - Generates 3 weeks of workouts via `generateWeekWorkouts()` for each week
   - Bulk inserts workouts via `createWorkouts()` with batching
7. API returns success with profile and workout count
8. Client redirects to `/dashboard`

**Dashboard Data Flow:**

1. User navigates to `/dashboard` (server component)
2. Server verifies auth via `requireAuth()`, redirects if not authenticated
3. Fetches user profile via `getProfile(user.id)`
4. Calculates current training week via `getCurrentWeekNumber(race_date)`
5. Fetches workouts for current week via `getWorkouts(user.id, { weekNumber: currentWeek })`
6. Renders dashboard with:
   - DashboardHeader: displays week number and current phase
   - VolumeTracking: aggregates workout durations by discipline, shows progress
   - WeeklyCalendar: displays workouts arranged by day of week
   - UpcomingWorkouts: shows list of incomplete workouts for the week

**Workout Operations Flow:**

1. User clicks "Complete"/"Skip"/"Reschedule" on WorkoutCard
2. Client calls action via `WorkoutActions` component
3. POST to `/api/workouts/[id]/complete|skip|reschedule`
4. API route:
   - Verifies auth and ownership (user_id match)
   - Calls `updateWorkout()` with new status/date/time
   - Returns updated workout
5. Client updates UI optimistically or with returned data

**State Management:**

- **Server State**: Profile, races, workouts fetched in server components and passed via props
- **Session State**: User stored in Supabase auth, accessed via `getUser()`, session-scoped
- **UI State**: Form inputs, loading states managed in client components with useState
- **Database State**: All persistent data in Supabase PostgreSQL with RLS policies

## Key Abstractions

**Profile (Legacy Combined Type):**
- Purpose: Represents consolidated user training info across multiple tables
- Examples: `types/database.ts` Profile interface (lines 189-202)
- Pattern: `combineToProfile()` in `lib/supabase/queries.ts` merges user_profiles, training_preferences, races, integrations into single Profile entity
- Reason: Simplifies API and component consumption; underlying schema is normalized

**Workout:**
- Purpose: Represents a single scheduled training session with discipline, type, duration, date/time
- Examples: `types/database.ts` Workout interface (lines 223-238)
- Pattern: `workoutRowToWorkout()` converts DB rows (string dates) to typed entities (Date objects)
- Reason: Type safety and consistent date handling across layers

**Phase (base|build|peak|taper):**
- Purpose: Categorizes training progression based on % of weeks until race
- Examples: `lib/plan-generation/phases.ts` getPhaseForWeek()
- Pattern: Phase determined by cumulative week count vs phase boundaries
- Reason: Allows phase-specific volume progression and user feedback

**Fitness Level (beginner|intermediate|advanced):**
- Purpose: Scales initial training volume via FITNESS_MULTIPLIERS
- Examples: `lib/plan-generation/constants.ts` (lines 9-13)
- Pattern: 0.6x/0.7x/0.8x multipliers applied to target weekly hours
- Reason: Personalizes progression based on athlete ability

**Discipline (swim|bike|run):**
- Purpose: Categorizes workout types
- Examples: Every workout has a discipline
- Pattern: DISCIPLINE_RATIOS allocate weekly volume: 18% swim, 52% bike, 30% run
- Reason: Ironman-specific distribution reflecting race demands

**WorkoutTemplate:**
- Purpose: Reusable weekly schedule structure defining day, type, volume %
- Examples: `lib/plan-generation/workouts.ts` generateWeekWorkouts()
- Pattern: WEEKLY_TEMPLATE defines template for each discipline; instantiated per week with volume scaled
- Reason: Reduces code duplication; allows flexible rescheduling of workout types

## Entry Points

**Landing Page:**
- Location: `app/page.tsx`
- Triggers: Unauthenticated user visits root URL
- Responsibilities: Display marketing, redirect authenticated users to dashboard/onboarding

**Authentication Pages:**
- Location: `app/(auth)/signin/page.tsx`, `app/(auth)/signup/page.tsx`
- Triggers: User clicks sign in/sign up links
- Responsibilities: Collect credentials, call Supabase auth, redirect to next step

**Onboarding Flow:**
- Location: `app/onboarding/page.tsx`, `app/onboarding/welcome/page.tsx`, `app/onboarding/race-info/page.tsx`, etc.
- Triggers: New authenticated user without profile
- Responsibilities: Collect race date, fitness level, availability; call POST /api/onboarding to create profile

**Dashboard:**
- Location: `app/dashboard/page.tsx`
- Triggers: Authenticated user with completed profile
- Responsibilities: Display current training week, workouts, volume tracking

**API Endpoints:**
- `POST /api/onboarding`: Create profile and initial workouts
- `POST /api/workouts/[id]/complete`: Mark workout complete
- `POST /api/workouts/[id]/skip`: Skip workout
- `POST /api/workouts/[id]/reschedule`: Reschedule workout

## Error Handling

**Strategy:** Combination of try-catch, validation checks, and error responses

**Patterns:**

In API routes (`app/api/...`):
```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();  // Throws/redirects if not auth
    const body = await request.json();

    // Validate inputs
    if (!raceDate || !fitnessLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Perform operation
    const profile = await createProfile(...);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

In queries (`lib/supabase/queries.ts`):
```typescript
const { data, error } = await client.from('workouts').select('*').eq('id', workoutId);
if (error) throw error;  // Bubbles to caller (API route)
if (!data) return null;   // Explicit null for missing data
return workoutRowToWorkout(data);
```

In server components:
```typescript
const user = await requireAuth();  // Redirects to /signin if not auth
const profile = await getProfile(user.id);
if (!profile) redirect('/onboarding');  // Enforces onboarding completion
```

In client components:
```typescript
try {
  const response = await fetch('/api/workouts/123/complete', { method: 'POST' });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
} catch (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' });
}
```

## Cross-Cutting Concerns

**Logging:**
- Approach: console.error() in error handlers for debugging
- Examples: `console.error('Onboarding error:', error)` in `app/api/onboarding/route.ts`
- No centralized logging service configured

**Validation:**
- Approach: Inline checks in API routes for input validation (required fields, date format)
- Examples: Input validation in POST /api/onboarding (lines 26-34)
- No schema validation library (Zod available but not actively used for runtime validation)

**Authentication:**
- Approach: requireAuth() guard on protected routes; Supabase session-based
- Examples: `const user = await requireAuth()` at top of dashboard and API routes
- All data queries respect Supabase Row-Level Security policies

**Authorization:**
- Approach: User ownership checks on operations (e.g., verify workout.user_id === authenticated user.id)
- Examples: `if (workout.user_id !== user.id) return 403` in complete/skip/reschedule routes
- Enforced at both API layer and database RLS layer

**Type Safety:**
- Approach: TypeScript strict mode, explicit Row vs Entity type mappings
- Examples: WorkoutRow (strings from DB) → Workout (typed object with Dates)
- Central type definitions in `types/database.ts` shared across codebase

---

*Architecture analysis: 2026-02-09*
