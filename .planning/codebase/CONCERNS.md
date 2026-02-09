# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Schema Migration in Progress:**
- Issue: Application code written for new schema (11 tables) but old schema (2 tables) still referenced in some query functions. Migration documents exist (`SCHEMA_REFACTOR.md`, `SCHEMA_COMPARISON.md`) but haven't been applied to database yet.
- Files: `lib/supabase/queries.ts`, `types/database.ts`, `app/api/onboarding/route.ts`
- Impact: If database schema doesn't match expected structure, all profile/race queries will fail silently or throw obscure errors. New tables (`workout_logs`, `equipment`, `body_metrics`, `training_zones`, `personal_records`) defined in types but not used in queries.
- Fix approach: Apply migration SQL from `SCHEMA_REFACTOR.md` to Supabase database, verify schema matches type definitions, test profile creation flows end-to-end.

**Generic Error Handling with Type Coercion:**
- Issue: Error handling uses `catch (error: any)` pattern throughout, losing type safety. API routes extract `error.message` which may be undefined.
- Files: `app/api/workouts/[id]/complete/route.ts` (line 34), `app/api/workouts/[id]/reschedule/route.ts` (line 44), `app/api/workouts/[id]/skip/route.ts` (line 33), `app/api/onboarding/route.ts` (line 71)
- Impact: Inconsistent error responses to client. Non-Error objects thrown could expose unexpected data structures. Client receives `error.message || 'Internal server error'` which masks actual problem.
- Fix approach: Create typed error handler utility, use `unknown` type in catch blocks with type guards, normalize all API error responses to consistent shape.

**Incomplete Query Function Abstraction:**
- Issue: `lib/supabase/queries.ts` creates helper functions for data transformation (`combineToProfile`, `workoutRowToWorkout`) but doesn't export or use a consistent abstraction for error cases. Some queries return `null` on error, others throw.
- Files: `lib/supabase/queries.ts` (lines 67, 77, 107 - return null; lines 148, 167, 185 - throw error)
- Impact: Inconsistent error handling at query layer. Callers must handle both null returns and exceptions. Race condition possible in `getProfile` if any of the multiple `select()` calls fails.
- Fix approach: Standardize error handling pattern - either all throw or all return null, not both. Add proper error context when combining multi-table queries.

## Known Bugs

**Missing Transaction in Profile Creation:**
- Symptoms: If `createProfile` fails partway through (e.g., race insert succeeds but training_preferences insert fails), partial data left in database. RLS prevents cleanup.
- Files: `lib/supabase/queries.ts` (lines 126-213)
- Trigger: Interrupt network request during onboarding after race created but before training_preferences inserted
- Workaround: Manual database cleanup or re-complete onboarding to overwrite partial data

**Race Filter in Profile Retrieval May Return No Race:**
- Symptoms: Dashboard fails to load; `getProfile` returns null even though user_profile and training_preference exist, if no upcoming race found.
- Files: `lib/supabase/queries.ts` (lines 79-107) - falls through to null return if race lookup fails
- Trigger: User completes onboarding, then race date passes without being updated, or race deleted from database
- Workaround: Create dummy race or update existing race date to future date

**Shallow Copy in Batch Workout Insert:**
- Symptoms: If workout insert fails partway through batch, earlier successful workouts remain in database; no rollback mechanism. Users may see duplicates if they retry onboarding.
- Files: `lib/supabase/queries.ts` (lines 356-409), specifically the chunking loop (lines 393-406)
- Trigger: Large batch insert (>100 workouts) fails mid-batch due to network or constraint violation
- Workaround: Manual deletion of duplicates from `workouts` table via Supabase dashboard

## Security Considerations

**Explicit Type Coercion of Untrusted User Input:**
- Risk: API routes accept user input without validation before passing to database queries. While type definitions exist, runtime validation is minimal.
- Files: `app/api/onboarding/route.ts` (lines 23-34 - validates structure but not ranges), `app/api/workouts/[id]/complete/route.ts` (line 13 - accepts `id` from URL params without validation)
- Current mitigation: Supabase RLS prevents cross-user access. Input validation exists for onboarding fields (weeks away check, hours range check).
- Recommendations: Use `zod` for runtime validation of all API request bodies and URL parameters before passing to queries. Add explicit type guards in error handlers.

**Service Role Key Stored in Environment:**
- Risk: `SUPABASE_SERVICE_ROLE_KEY` defined in `lib/supabase/server.ts` (line 10-12) but marked as required at module load time. If not set, app crashes. Key has ability to bypass RLS.
- Files: `lib/supabase/server.ts` (lines 49-60 - creates admin client but not used anywhere currently)
- Current mitigation: Admin client created but appears unused (search shows no calls to `supabaseAdmin`). RLS on all tables prevents accidental misuse.
- Recommendations: Either remove unused admin client or add explicit audit logging if it's used. Document when admin client should/shouldn't be used.

**Google OAuth Tokens Stored in Database:**
- Risk: OAuth access/refresh tokens stored in `integrations` table in plain text (from `combineToProfile` lines 35-36). Compromise of database exposes user's Google Calendar access.
- Files: `lib/supabase/queries.ts` (lines 34-36), `types/database.ts` (IntegrationRow type)
- Current mitigation: Supabase RLS prevents unauthorized access. HTTPS in transit.
- Recommendations: Encrypt tokens at rest using database column encryption or move to separate encrypted vault. Implement token rotation strategy.

**Client-Side Redirect After Onboarding:**
- Risk: `app/onboarding/generating/page.tsx` (line 85) uses `window.location.replace('/dashboard')` which could be intercepted. No state validation before redirect.
- Files: `app/onboarding/generating/page.tsx` (lines 84-85)
- Current mitigation: `proxy.ts` middleware checks authentication before allowing dashboard access. RLS on queries prevents data access without valid session.
- Recommendations: Validate profile exists server-side before allowing dashboard navigation. Use Next.js `router.push()` with server-side validation instead of `window.location.replace()`.

## Performance Bottlenecks

**Multiple Sequential Database Calls in getProfile:**
- Problem: `getProfile` makes 4 separate database round-trips (user_profiles, training_preferences, races, integrations). Each is awaited sequentially before starting the next.
- Files: `lib/supabase/queries.ts` (lines 54-124)
- Cause: Race lookup has conditional logic that requires user_profile and training_preference data first. Cannot parallelize due to data dependencies.
- Improvement path: Use `Promise.all()` for independent lookups (training_preferences and integrations can load in parallel). Cache profile at request level to avoid duplicate calls on same page.

**No Pagination or Limits on Workout Queries:**
- Problem: `getWorkouts()` returns all workouts for user without limit. Dashboard loads every planned workout for the entire 16-week plan, even though only current week visible.
- Files: `lib/supabase/queries.ts` (lines 304-334)
- Cause: Query builds on `client.from('workouts').select('*')` with no `.limit()` until filters applied
- Improvement path: Add default limit parameter, implement cursor-based pagination for large result sets. Only load visible week + 1 week lookahead.

**Client-Side DOM Rendering of 40+ Workout Cards Weekly:**
- Problem: `components/dashboard/WeeklyCalendar.tsx` (569 lines) renders draggable components for every workout on calendar. Creates large DOM tree even when scrolled off-screen.
- Files: `components/dashboard/WeeklyCalendar.tsx` (lines 38-200+)
- Cause: All workouts render simultaneously; no virtualization or windowing
- Improvement path: Implement react-window or similar virtualization library to render only visible time slots. Lazy-load workout details on demand.

**Batch Insert Default of 100 Workouts Per Chunk:**
- Problem: `createWorkouts()` default batch size 100 works for initial plan generation (3 weeks = ~24 workouts) but becomes inefficient when generating full 16-week plan (~128 workouts).
- Files: `lib/supabase/queries.ts` (line 358)
- Cause: Default chosen arbitrarily; no benchmarking against Supabase limits
- Improvement path: Test actual Supabase batch insert limits; tune batch size to sweet spot between network roundtrips and response time. Consider Supabase bulk insert limits (typically 1000 rows).

## Fragile Areas

**Plan Generation Calculation Chain:**
- Files: `lib/plan-generation/workouts.ts` (lines 15-50), `lib/plan-generation/volume.ts`, `lib/plan-generation/phases.ts`, `lib/plan-generation/constants.ts`
- Why fragile: Multiple functions depend on exact return types and numeric precision. Math operations round at each step (`Math.round(swimHours * template.volumePct * 60)` line 43). Small rounding errors compound.
- Safe modification: Add comprehensive unit tests for each calculation function. Verify total weekly hours match target after rounding. Never modify discipline ratios or phase percentages without updating tests.
- Test coverage: No test files exist for plan generation logic. All calculations untested.

**Onboarding Flow State Management:**
- Files: `app/onboarding/race-info/page.tsx`, `app/onboarding/availability/page.tsx`, `app/onboarding/generating/page.tsx`
- Why fragile: Multi-step form state stored in URL search params or form state, but generating page makes blocking API call without validating previous steps completed. If user navigates directly to generating page without completing race-info, submission fails silently.
- Safe modification: Use form library with proper validation (React Hook Form + zod). Validate entire onboarding state in API handler before creating profile. Redirect incomplete flows back to first step.
- Test coverage: No tests for onboarding flow. Race date validation exists but availability validation incomplete (no max hours check visible in race-info).

**Supabase Client Creation Across Request Boundary:**
- Files: `lib/supabase/auth.ts` (line 2), `lib/supabase/server.ts` (line 18-43)
- Why fragile: Each call to `getSupabaseClient()` or `createClient()` reads cookies and creates new client. If middleware modifies cookies mid-request, subsequent calls may use stale session.
- Safe modification: Test that concurrent API calls within same request share session state correctly. Document that `getSupabaseClient()` must be called fresh for each request (don't cache across requests).
- Test coverage: No tests verifying session handling across multiple Supabase calls.

**Drag-and-Drop Calendar UI Without Optimistic Updates:**
- Files: `components/dashboard/WeeklyCalendar.tsx` (lines 63-200+)
- Why fragile: Dragging workout updates database, but UI updates after server response. If network is slow or fails, user sees workouts snap back. Complex state management with `useDraggable` and `useDroppable` from `@dnd-kit`.
- Safe modification: Implement optimistic updates - update local state immediately, revert on error. Add loading states and error recovery. Test network failure scenarios.
- Test coverage: No tests for drag-and-drop functionality.

## Scaling Limits

**Single Workout Generation Pass at Onboarding:**
- Current capacity: Generates first 3 weeks of workouts (~24 workouts) synchronously in onboarding route
- Limit: Onboarding route POST times out if generation exceeds ~30 seconds. Full 16-week plan (~128 workouts) would likely exceed this.
- Scaling path: Defer full plan generation to background job. Generate initial 3 weeks synchronously, then queue remaining weeks for async generation. Return dashboard immediately with partial plan.

**No Cron Job for Rolling Plan Generation:**
- Current capacity: Plan generated once at onboarding. No mechanism to generate future weeks automatically.
- Limit: Users must manually request new weeks (no UI for this currently). After week 16, no workouts exist.
- Scaling path: Implement cron job (Vercel Crons or external scheduler) to generate next 2 weeks every Monday. Track generation in database to prevent duplicates.

**Weekly Calendar Rendering Performance at Scale:**
- Current capacity: ~8 workouts per week render smoothly on desktop
- Limit: If user adds multiple events per time slot or loads month view, rendering degrades. No virtual scrolling.
- Scaling path: Implement react-window virtualization. Add week/month view toggle with appropriate rendering strategy for each.

**Batch Workout Insert Lacks Retry Logic:**
- Current capacity: Network glitch during any chunk insert causes entire batch to fail
- Limit: Cannot retry partial failure; entire batch must be re-submitted
- Scaling path: Implement exponential backoff retry for failed chunks. Track successfully inserted workouts to avoid duplicates on retry.

## Dependencies at Risk

**Next.js 16 with App Router:**
- Risk: App Router is relatively new and API surface still evolving. Some deprecations possible in future versions.
- Impact: If middleware or server component APIs change significantly, refactoring required.
- Migration plan: Monitor Next.js release notes. Upgrade incrementally; test onboarding flow thoroughly after each major version bump.

**@dnd-kit Drag-and-Drop Without Active Maintenance:**
- Risk: Complex state management in `WeeklyCalendar.tsx`. Library may have performance issues with large DOM trees.
- Impact: Drag interactions could become janky as calendar grows. Limited community support compared to alternatives like react-beautiful-dnd.
- Migration plan: If performance degrades, consider migrating to maintained alternative or simpler drag implementation.

**Supabase SDK Version Pinned:**
- Risk: `@supabase/supabase-js` at `^2.39.0` and `@supabase/ssr` at `^0.8.0`. Wildcard allows minor updates but locks major version.
- Impact: Features or security fixes in supabase-js 3.x unavailable. Auth flows may change in future versions.
- Migration plan: Review supabase-js changelog quarterly. Plan major version upgrades with full testing of auth and RLS flows.

## Missing Critical Features

**No Workout Logging Implementation:**
- Problem: Database schema includes `workout_logs` table for actual performance data (distance, HR, pace, feeling) but frontend has no UI to log workouts. Dashboard only shows completion status.
- Blocks: Cannot track actual vs planned performance. No training data export. No personal records tracking.

**No Rolling Week Generation:**
- Problem: Only first 3 weeks generated at onboarding. No mechanism to generate future weeks automatically or on-demand.
- Blocks: Users see empty calendar after week 3. Cannot maintain continuous 4-week rolling plan.

**No Google Calendar Sync Implementation:**
- Problem: Database schema and OAuth tokens prepared but sync logic not implemented. README lists as "coming soon".
- Blocks: Workouts don't appear in user's Google Calendar. Cannot schedule around other events.

**No Body Metrics or Equipment Tracking:**
- Problem: Database schema includes `body_metrics` and `equipment` tables with all fields, but no queries or UI to use them.
- Blocks: Cannot track weight, body composition, recovery. Cannot track bike maintenance schedules.

**No Offline Support or Service Worker:**
- Problem: Dashboard requires network access. Viewing plan offline not possible. PWA features not implemented.
- Blocks: Mobile users on poor connections cannot see workouts.

## Test Coverage Gaps

**Plan Generation Algorithm - Zero Tests:**
- What's not tested: All calculation functions in `lib/plan-generation/` have no test files. Rounding behavior, phase distribution, discipline ratios untested.
- Files: `lib/plan-generation/workouts.ts`, `lib/plan-generation/phases.ts`, `lib/plan-generation/volume.ts`
- Risk: Math rounding errors could silently create incorrect plans. Changes to constants break behavior without detection.
- Priority: HIGH - Core business logic has no safety net.

**Onboarding Flow - No End-to-End Tests:**
- What's not tested: Multi-step form flow, profile creation, workout generation. Manual testing only.
- Files: `app/onboarding/` pages, `app/api/onboarding/route.ts`
- Risk: Race conditions in form state. Silent failures in profile creation. Users stuck in onboarding loop.
- Priority: HIGH - User-facing critical path.

**Drag-and-Drop Calendar - No Tests:**
- What's not tested: Workout rescheduling via drag interaction, drop zone detection, time snapping logic.
- Files: `components/dashboard/WeeklyCalendar.tsx`
- Risk: Usability regressions go unnoticed. Dragging to wrong time slot or date possible without detection.
- Priority: MEDIUM - Complex UI interaction without coverage.

**API Error Responses - No Tests:**
- What's not tested: Error handling in `/api/workouts/[id]/*` and `/api/onboarding/route.ts`. What happens when Supabase returns error? Auth check failure?
- Files: `app/api/workouts/[id]/complete/route.ts`, `app/api/workouts/[id]/reschedule/route.ts`, `app/api/workouts/[id]/skip/route.ts`
- Risk: Unhelpful error messages to client. Crash without proper error response.
- Priority: MEDIUM - Error paths should be tested.

**Authentication Middleware - No Tests:**
- What's not tested: Redirect logic in `proxy.ts`. Session refresh behavior. Cross-domain behavior.
- Files: `proxy.ts`
- Risk: Auth bypass if middleware logic broken. Users redirected unexpectedly.
- Priority: HIGH - Security-critical.

---

*Concerns audit: 2026-02-09*
