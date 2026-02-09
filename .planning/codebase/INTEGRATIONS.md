# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**Google APIs:**
- Google Calendar
  - SDK/Client: `googleapis` 128.0.0
  - Auth: OAuth 2.0 via Google
  - Configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Purpose: Calendar synchronization for workout scheduling
  - Implementation: OAuth tokens stored in `integrations` table

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Client: `@supabase/supabase-js` 2.39.0
  - ORM: Direct SQL queries via Supabase client
  - Query layer: `lib/supabase/queries.ts` - Handles all database operations

**File Storage:**
- Local filesystem only - No external storage integration detected

**Caching:**
- None detected - No caching layer implemented

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: Cookie-based session management via `@supabase/ssr`
  - Server client: `lib/supabase/server.ts` - Handles server-side authentication with RLS
  - Browser client: `lib/supabase/client.ts` - Client-side authentication
  - Auth utilities: `lib/supabase/auth.ts` - `requireAuth()`, `getUser()`, `getSession()` helpers
  - Protected routes: Server Actions and Route Handlers enforce authentication via `requireAuth()`
  - OAuth integration planned: Google OAuth for calendar sync (infrastructure in place)

## Monitoring & Observability

**Error Tracking:**
- None detected - Basic console.error() only

**Logs:**
- Console logging only - No centralized logging service

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from Next.js 16 + typical deployment)

**CI Pipeline:**
- None detected - No GitHub Actions or CI configuration present

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - NextAuth callback URL (legacy, may not be in use)
- `NEXTAUTH_SECRET` - NextAuth session secret (legacy, may not be in use)
- `CRON_SECRET` - Cron job authentication token
- `DATABASE_URL` (optional) - PostgreSQL URI for migrations (or constructed from Supabase credentials)

**Secrets location:**
- `.env.local` - Next.js default environment file (not committed)
- `.env` - Fallback environment file (not committed)
- `.env.example` - Template showing required variables

## Webhooks & Callbacks

**Incoming:**
- Supabase webhooks infrastructure available but not actively configured
- API endpoints: `app/api/workouts/[id]/complete`, `app/api/workouts/[id]/skip`, `app/api/workouts/[id]/reschedule`, `app/api/onboarding`

**Outgoing:**
- Google Calendar sync planned (infrastructure in place via `integrations` table)
  - OAuth tokens stored but not actively syncing
  - Calendar ID stored: `calendar_id` field in `integrations` table
  - Status tracking: `last_sync_at`, `last_sync_status`, `last_sync_error` fields

## Supabase Integration Details

**Auth System:**
- Supabase Auth manages user authentication
- Users stored in Supabase `auth.users` table
- User profiles extended in `user_profiles` table (references `auth.users.id`)
- Row Level Security (RLS) policies defined in `supabase/migrations/003_policies.sql`

**Database Schema:**
- 11 main tables: user_profiles, user_settings, races, training_preferences, workouts, equipment, workout_logs, body_metrics, training_zones, personal_records, integrations
- Migrations: `supabase/migrations/001_schema.sql` (schema), `002_triggers.sql` (triggers), `003_policies.sql` (RLS), `004_seed_data.sql` (test data)
- Migration runner: `scripts/run-migrations.js` - Interactive Node.js CLI for applying migrations

**Integrations Table:**
- Location: `supabase/migrations/001_schema.sql` lines 326-354
- Supported providers: google_calendar, strava, garmin, trainingpeaks, whoop, other
- Fields: access_token, refresh_token, token_expires_at, calendar_id, sync_settings (JSONB)
- Status tracking: is_active, last_sync_at, last_sync_status, last_sync_error
- Constraint: One integration per user per provider

## API Routes

**Onboarding:**
- `POST /api/onboarding` (`app/api/onboarding/route.ts`)
  - Creates user profile, training preferences, race, and generates initial workouts
  - Returns: profile, workouts count, success message

**Workout Management:**
- `POST /api/workouts/[id]/complete` - Mark workout as completed
- `POST /api/workouts/[id]/skip` - Skip a scheduled workout
- `POST /api/workouts/[id]/reschedule` - Reschedule a workout

## Data Query Layer

**Profile Management:**
- `getProfile(userId)` - Fetch full user profile with related data
- `createProfile(profile)` - Create user profile, training prefs, race, and integrations
- `updateProfile(userId, updates)` - Update profile, training prefs, and integrations

**Workout Management:**
- `getWorkouts(userId, filters)` - Fetch workouts with optional filtering
- `getWorkout(workoutId)` - Fetch single workout
- `createWorkouts(workouts, batchSize)` - Batch insert workouts (handles chunking for large sets)
- `updateWorkout(workoutId, updates)` - Update workout status or dates

---

*Integration audit: 2026-02-09*
