# Project Research Summary

**Project:** Iron Life Man - Calendar Integration + Drag-Drop Scheduling
**Domain:** Training calendar management for Ironman athletes with work-life balance integration
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

Iron Life Man requires Google Calendar integration and drag-drop scheduling to solve a core problem: Ironman athletes need training that adapts to work calendars. Research reveals this is a bridging product—combining calendar app sync capabilities with training load intelligence that neither TrainingPeaks nor generic calendar tools provide.

The recommended approach uses Next.js 16 App Router with Server Actions for optimistic drag-drop, Google Calendar API with webhook-based sync (not polling), and oauth2 token management via Supabase Vault. Critical architectural decision: implement field-level conflict resolution from day one (not last-write-wins) to prevent data loss from concurrent edits. The drag-drop library choice requires immediate validation: @dnd-kit/react is actively maintained but React 19 compatibility is uncertain; pragmatic-drag-and-drop is production-proven at scale but has a lower-level API.

Key risks center on OAuth token lifecycle (7-day expiry in testing mode causes silent failures), timezone handling (UTC-only storage breaks DST transitions), and accessibility compliance (WCAG 2.2 SC 2.5.7 requires single-pointer alternatives to drag). These risks are mitigated through published OAuth apps, IANA timezone storage, and keyboard navigation built into initial drag-drop implementation—not deferred to "Phase 2."

## Key Findings

### Recommended Stack

The existing Next.js 16 + Supabase architecture extends cleanly with googleapis (already installed at v128, latest v171) for calendar integration and either @dnd-kit/react (v0.2.4, actively maintained) or pragmatic-drag-and-drop (v1.x, Atlassian's production library) for drag-drop. Both drag libraries support React 19, but @dnd-kit/react is newer with less community validation, while pragmatic-drag-and-drop has proven scale (powers Trello/Jira) with more implementation complexity.

**Core technologies:**
- **googleapis v171+**: Official Google Calendar API client with OAuth2, event CRUD, and webhook support — actively maintained (updated 4 days ago), handles token refresh
- **@dnd-kit/react v0.2.4 OR pragmatic-drag-and-drop v1.x**: Drag-drop with React 19 compatibility — @dnd-kit has simpler API and built-in accessibility; pragmatic has production validation and performance focus
- **Supabase Vault + PostgreSQL**: Encrypted OAuth token storage with RLS policies — leverages existing infrastructure, no KMS setup required
- **Next.js Server Actions + Route Handlers**: Server-side mutations with optimistic UI (useOptimistic hook) — native Next.js 16 patterns, type-safe RPC without manual API routes
- **date-fns-tz v2.0+**: Timezone-aware date manipulation — critical for DST handling, already installed in project

**Critical version note:** googleapis should be upgraded from v128 to v171 for latest Calendar API improvements. @dnd-kit/core (v6.3.1, installed) has reported React 19 issues and was last updated 1 year ago—do not use without testing; prefer @dnd-kit/react instead.

### Expected Features

Research reveals a gap in the market: TrainingPeaks has strong training features but weak calendar integration (manual export only), while calendar apps like Morgen have strong sync but no training context. Iron Life Man's opportunity is bidirectional sync with training load awareness.

**Must have (table stakes):**
- Two-way Google Calendar sync with automatic refresh (15-min intervals acceptable for MVP)
- Conflict detection when workouts overlap with work meetings
- Multiple calendar support (1 write calendar for workouts, 2 read calendars for conflicts)
- Drag workout to new day/time with visual feedback and undo
- Privacy controls (users choose what syncs where)
- Timezone handling with IANA names (not just UTC offsets)
- Touch-friendly drag targets and keyboard alternative (accessibility requirement)

**Should have (competitive advantage):**
- AI suggestions when dropping workouts ("This creates overtraining, try Wednesday instead?")
- Drag-to-swap workouts intelligently (drag Tuesday's swim onto Thursday's swim to swap them)
- Constraint visualization (show why certain drops are blocked with overlay hints)
- Commute-aware scheduling (factor travel time between meetings and training locations)
- Smart block time creation (one-click "block training time in work calendar")

**Defer (v2+):**
- Meeting pattern learning (ML on historical calendar data for predictive scheduling)
- Calendar-based recovery adjustment (detect high-stress work weeks, reduce training volume)
- Multi-timezone race prep (gradually shift workout times for races in different timezones)
- Cascade rescheduling (moving one workout triggers downstream adjustments)
- Multi-select drag (select multiple workouts, drag together to new week)

**Anti-features to avoid:**
- Sync ALL workout details to work calendar (privacy concern—default to generic "Training" with opt-in detail levels)
- Bidirectional workout editing (editing duration in Google Calendar syncs back creates conflicts)
- Real-time sync <1 second (expensive, drains battery, causes race conditions—15-min is sufficient)
- Drag past workouts (history should be immutable—only future + today's incomplete workouts draggable)
- Free-form drag anywhere (creates chaos—constrain to valid time slots with 30-min snapping)

### Architecture Approach

The architecture follows Next.js 16 App Router patterns: Server Components fetch data, Client Components handle drag interactivity, Server Actions execute mutations, and Route Handlers manage OAuth callbacks and webhooks. Token management follows Supabase SSR patterns—refresh tokens in middleware, pass via server-only contexts, never expose to client.

**Major components:**

1. **OAuth Flow Handler** (API routes: `/api/oauth/google/authorize`, `/api/oauth/google/callback`) — Initiates Google OAuth with PKCE, exchanges authorization code for tokens, stores encrypted tokens in Supabase Vault with RLS policies, sets up webhook channel for calendar push notifications

2. **Calendar Sync Service** (`lib/calendar/sync.ts`) — Reads work calendar via incremental sync with sync_token (not full polling), writes workouts to Google Calendar, detects conflicts by cross-referencing events, processes webhook notifications for real-time updates, handles channel renewal before 7-day expiry

3. **Drag-Drop UI with Optimistic Updates** (`components/calendar/WorkoutCalendar.tsx`) — Client component using useOptimistic hook for instant feedback, validates moves client-side before server mutation, calls moveWorkout() Server Action, reverts on server error, syncs to Google Calendar via background queue

4. **Load Calculator** (`lib/load-calculator/`) — Pure function module that recalculates weekly training load after workout mutations, validates schedule feasibility (prevents >120% weekly target), checks discipline conflicts (no duplicate swim days), provides feedback for drag-drop constraints

5. **Sync Queue Processor** (`calendar_sync_jobs` table + cron/Edge Function) — Queues calendar operations (create/update/delete events), processes asynchronously with exponential backoff on rate limits, enables optimistic UI (don't wait for Google API), handles retry logic for failures

6. **Token Manager** (`lib/calendar/tokens.ts`) — Refreshes expired tokens automatically using refresh_token, implements RFC 9700 token rotation (new refresh token on each use, detect reuse as security breach), stores tokens encrypted via Supabase Vault, never logs tokens

**Integration with existing architecture:** OAuth routes use existing `requireAuth()` middleware, calendar sync extends `lib/supabase/queries.ts` with calendar-specific functions, drag-drop hooks into existing workout mutation paths (onboarding, completion, reschedule), training load calculator uses existing constants from `lib/plan-generation/constants.ts`.

### Critical Pitfalls

1. **Naive Last-Write-Wins Sync Leads to Data Loss** — User edits workout time in Google Calendar while app marks it complete; LWW picks one change, silently discarding the other. **Avoid:** Implement field-level merge strategy (preserve both changes when fields don't overlap), use optimistic locking with version numbers, show conflict UI when merge is ambiguous. **Phase to address:** Phase 1 (Foundation)—conflict resolution architecture must be designed upfront.

2. **OAuth Token Expiry Causes Silent Sync Failures** — Google OAuth clients in "testing" mode expire after 7 days; refresh tokens fail without notification; app keeps trying stale tokens instead of triggering re-auth. **Avoid:** Publish OAuth app before launch (testing mode for dev only), implement RFC 9700 token rotation (detect reuse as security event), show sync status UI ("Last synced: 2 hours ago" with error state), proactively prompt re-auth when refresh fails. **Phase to address:** Phase 1 (OAuth Foundation) for rotation architecture, Phase 2 (Sync Engine) for status UI.

3. **Timezone Handling with UTC Storage Breaks DST Transitions** — Workout scheduled for "6am every Monday" stored as UTC offset (-05:00); when DST transitions, recurring event shifts to 5am/7am because offset changed but stored time didn't. **Avoid:** Store IANA timezone names ("America/New_York" not "EST"), use `DTSTART;TZID=America/New_York:20260309T060000` format for recurring events (not UTC), test DST boundary cases (March/November). **Phase to address:** Phase 1 (Data Model)—timezone storage architecture requires migration to fix later.

4. **Google Calendar API Rate Limits Hit Without Backoff** — User drags 20 workouts rapidly; each triggers API call; after 10 updates, hits rate limit (60 queries/minute/user); subsequent updates fail silently. **Avoid:** Batch updates (queue changes, send as single request), debounce (wait 500ms after last drag), implement exponential backoff on 429 responses (1s → 2s → 4s → 8s → 32s max), use optimistic UI with rollback on failure. **Phase to address:** Phase 2 (Drag-Drop)—debouncing and batching must be in initial implementation.

5. **Drag-Drop Inaccessible to Keyboard/Screen Reader Users** — Workout schedule only supports mouse drag-drop; no keyboard alternative; WCAG 2.2 SC 2.5.7 violation. **Avoid:** Implement keyboard navigation (Tab + Arrow keys + Enter), add alternative UI (up/down buttons, context menu "Move to..."), screen reader announcements, ARIA labels, focus management. Use @dnd-kit (accessibility built-in) over libraries requiring manual setup. **Phase to address:** Phase 2 (Drag-Drop UI)—accessibility must be built into initial implementation, not retrofitted.

6. **Training Load Recalculation Bugs from Concurrent Edits** — User drags workout from Monday to Wednesday; load recalculates (500ms); user drags different workout to Monday before first calculation completes; second calculation overwrites first; final state shows wrong load. **Avoid:** Wrap workout move + load recalculation in atomic transaction, use optimistic locking with version numbers, serialize recalculations per user (queue), debounce drag activity before recalculating. **Phase to address:** Phase 2 (Drag-Drop + Load Recalculation)—race condition handling must be designed upfront.

7. **Recurring Event Modification Creates RRULE Chaos** — User drags one instance of recurring workout (e.g., "Run 5K every Monday"); app either moves ALL future Mondays (wrong), breaks recurrence entirely (wrong), or creates 52 individual events (database bloat). **Avoid:** Use RECURRENCE-ID exceptions for single-instance edits, ask user "Change this workout only or all future?", limit exceptions (<50 per series), test modification of first/middle/last instance plus DST boundaries. **Phase to address:** Phase 2 (Recurring Workouts)—RRULE exception handling requires schema changes if bolted on later.

## Implications for Roadmap

Based on research, the recommended phase structure balances technical dependencies (OAuth before sync, sync before drag-drop) with user value delivery (two-way sync is the killer feature). Critical path: OAuth Foundation → Calendar Sync (Write) → Drag-Drop → Conflict Resolution. Load calculation and webhook setup can run in parallel to drag-drop UI development.

### Phase 1: OAuth Foundation + Data Model
**Rationale:** OAuth token management and timezone storage are architectural decisions that are expensive to change later. Token rotation (RFC 9700) and IANA timezone names must be designed upfront—fixing silently failing syncs or DST bugs after launch requires data migrations and user re-education.

**Delivers:**
- Google OAuth flow (authorize → callback → store encrypted tokens)
- Token refresh with rotation (detect reuse as security event)
- Database schema: `integrations` table (Vault-encrypted tokens), `calendar_sync_state` table (sync_token, channel_id), `calendar_sync_jobs` table (async queue)
- Timezone-aware workout storage (add `scheduled_timezone` column, store IANA names)

**Addresses:**
- Table stakes: OAuth authentication, timezone handling
- Pitfall #2 (token expiry) via rotation architecture
- Pitfall #3 (DST bugs) via IANA timezone storage

**Research flags:** Standard OAuth patterns—no additional research needed. Google Calendar API documentation is comprehensive (HIGH confidence).

### Phase 2: Calendar Sync (Write-Only)
**Rationale:** Prove value immediately by writing workouts to Google Calendar. This is simpler than bidirectional sync (no conflict resolution yet) and delivers the core user benefit: "My training appears in my calendar." Webhook setup deferred to Phase 3; initial MVP uses periodic polling (15-min intervals) as acceptable trade-off.

**Delivers:**
- Write workouts to Google Calendar (create/update/delete events)
- Async sync queue (background job processes `calendar_sync_jobs` table)
- Sync status UI ("Last synced: 5 min ago" with manual "Sync now" button)
- Hook into existing workout mutations (onboarding, complete, reschedule)

**Uses:**
- googleapis v171 for Calendar API client
- Supabase Edge Functions or Vercel Cron for queue processing
- Next.js Server Actions for sync triggering

**Addresses:**
- Table stakes: two-way sync (write direction), automatic refresh, event details in sync
- Pitfall #4 (rate limits) partially via async queue and batching

**Research flags:** Queue architecture requires light research on Supabase Edge Functions vs Vercel Cron trade-offs (MEDIUM confidence—both approaches are documented but need comparison for this use case).

### Phase 3: Webhook Setup (Read Calendar)
**Rationale:** Reading work calendar enables conflict detection—the key differentiator over TrainingPeaks. This phase completes bidirectional sync. Webhooks provide real-time updates (98.5% reduction in polling) and are essential for production quality, but MVP can defer this in favor of faster Phase 2 delivery.

**Delivers:**
- Google Calendar webhook endpoint (verify signature, route to user)
- Webhook channel setup (POST /watch, store channel_id, handle 7-day renewal)
- Conflict detection (cross-reference work events with workout schedule)
- Conflict UI (read-only display: "3 conflicts this week")

**Uses:**
- Next.js Route Handler (`/api/calendar/webhook`)
- `lib/calendar/webhooks.ts` for channel management
- `calendar_conflicts` table for storing detected conflicts

**Implements:**
- Hybrid sync pattern (webhooks primary, polling fallback)
- Incremental sync with sync_token (only fetch changes since last sync)

**Addresses:**
- Table stakes: conflict detection, multiple calendar support (read work calendars)
- Pitfall #1 (data loss) foundation—conflict detection identifies issues before resolution needed

**Research flags:** Webhook security and signature verification patterns need validation (MEDIUM confidence—Google docs cover this but implementation details require testing).

### Phase 4: Drag-Drop UI + Load Validation
**Rationale:** Visual rescheduling is the second core feature (after calendar sync). Drag-drop combines with training load validation to provide intelligent constraints—the differentiator over generic calendar apps. This phase must include accessibility from day one (WCAG 2.2 requirement) and race condition handling for load recalculation (expensive to fix later).

**Delivers:**
- Drag-drop calendar interface (weekly view with WorkoutCard + DaySlot components)
- Optimistic UI with useOptimistic hook (instant feedback, rollback on error)
- Keyboard navigation (Tab + Arrow keys + Enter) and screen reader support
- Training load calculator (calculate weekly load, validate moves, prevent overtraining)
- Constraint visualization (highlight valid drop zones, show warnings on invalid drops)
- Undo button (5s timeout) and CMD+Z keyboard shortcut

**Uses:**
- @dnd-kit/react v0.2.4 (if React 19 testing validates) OR pragmatic-drag-and-drop v1.x (production fallback)
- React useOptimistic hook for optimistic updates
- Server Actions for moveWorkout() mutation
- `lib/load-calculator/` module for validation

**Addresses:**
- Table stakes: drag to new day/time, visual feedback, undo, snap to grid, prevent invalid drops, touch-friendly, keyboard alternative
- Pitfall #4 (rate limits) via debouncing and batching
- Pitfall #5 (accessibility) via keyboard nav and ARIA labels built-in
- Pitfall #6 (race conditions) via atomic transactions and debouncing

**Research flags:**
- **HIGH priority:** Validate @dnd-kit/react React 19 compatibility immediately (test drag-drop in Next.js 16 environment before committing to library choice)
- **MEDIUM priority:** Accessibility testing with real screen readers (VoiceOver, NVDA) to validate ARIA implementation
- Standard patterns for useOptimistic and load calculation (HIGH confidence)

### Phase 5: Conflict Resolution UI
**Rationale:** Complete the bidirectional sync by allowing users to resolve conflicts interactively. This phase builds on conflict detection from Phase 3 and enables field-level merge strategy (avoiding data loss from concurrent edits). Deferred from Phase 4 to deliver drag-drop value sooner.

**Delivers:**
- Conflict resolution modal ("You changed X in app, but Y in Google Calendar. Keep which version?")
- Field-level merge strategy (preserve both changes when fields don't overlap)
- User actions: keep app version, keep calendar version, merge both, cancel
- Automatic resolution preferences ("Always prefer app edits for time changes")

**Implements:**
- Optimistic locking with version numbers
- Conflict queue (detect conflict → notify user → resolve → sync)

**Addresses:**
- Pitfall #1 (data loss from LWW) via field-level merge and conflict UI
- Table stakes: two-way sync fully operational

**Research flags:** Conflict resolution UX patterns need light research (MEDIUM confidence—established patterns exist but need adaptation for training context).

### Phase 6: Recurring Workouts + RRULE Handling
**Rationale:** Recurring events are complex (RRULE exceptions, DST transitions, modification patterns) and higher risk than one-off events. Deferring this allows core calendar integration to stabilize before adding recurrence complexity. Training plans have weekly structure, so recurring support is eventually essential.

**Delivers:**
- Recurring workout creation ("Run 5K every Monday at 6am")
- RECURRENCE-ID exceptions for single-instance edits
- "This or all future" modification UI
- DST transition handling (verify 6am stays 6am across March/November)

**Uses:**
- RRULE library (rrule.js) for parsing and generation
- Database schema: store RRULE + exceptions (not expanded instances)

**Addresses:**
- Pitfall #7 (RRULE chaos) via exception mechanism and user prompts

**Research flags:**
- **HIGH priority:** RRULE exception patterns with Google Calendar API (MEDIUM confidence—RFC 5545 documented but Google Calendar interop needs testing)
- DST edge cases require comprehensive testing (HIGH priority for correctness)

### Phase Ordering Rationale

- **OAuth before sync:** Can't sync without tokens; token architecture (rotation, encryption) must be correct before use
- **Write sync before read sync:** Deliver value immediately (workouts in calendar); reading work calendar is complex (conflict detection)
- **Webhook setup deferred:** Polling (15-min intervals) sufficient for MVP; webhooks optimize scale but add complexity
- **Drag-drop after sync:** Drag-drop requires sync to be valuable (moving workouts must update calendar); order maximizes early value
- **Load validation with drag-drop:** Load recalculation race conditions require atomic transactions; expensive to fix if bolted on later
- **Conflict resolution after drag-drop:** Conflicts are rare initially (new users); drag-drop delivers more visible value sooner
- **Recurring events last:** Highest complexity, highest risk; let one-off event patterns stabilize first

**Dependency graph:**
```
Phase 1 (OAuth) → Phase 2 (Write Sync) → Phase 4 (Drag-Drop)
                                            ↓
Phase 1 (OAuth) → Phase 3 (Webhooks) → Phase 5 (Conflict Resolution)
                                            ↑
                  Phase 4 (Drag-Drop) → Phase 6 (Recurring Events)
```

**Critical path:** OAuth → Write Sync → Drag-Drop (delivers core value)
**Parallel work:** Phase 3 (Webhooks) and Phase 4 (Drag-Drop) can develop in parallel after Phase 2 completes

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2 (Queue Architecture):** Choice between Supabase Edge Functions vs Vercel Cron for sync queue processing—both approaches documented but need comparison for this specific use case (cost, concurrency limits, retry logic)
- **Phase 4 (Drag Library Choice):** Critical decision requires immediate validation—test @dnd-kit/react with React 19 in Next.js 16 environment; if compatibility issues arise, fall back to pragmatic-drag-and-drop with documented migration path
- **Phase 4 (Accessibility Testing):** WCAG 2.2 compliance requires real screen reader testing (VoiceOver, NVDA)—patterns exist but need validation with actual assistive technology
- **Phase 6 (RRULE + Google Calendar Interop):** RECURRENCE-ID exception patterns with Google Calendar API need testing—RFC 5545 is comprehensive but Google's specific implementation may have quirks

Phases with standard patterns (skip research-phase):

- **Phase 1 (OAuth):** Google OAuth 2.0 with PKCE is well-documented; Supabase Vault encryption patterns are established
- **Phase 2 (Write Sync):** Google Calendar API event creation is straightforward; googleapis library has comprehensive examples
- **Phase 3 (Webhook Security):** Webhook signature verification is standard pattern; Google docs provide reference implementation
- **Phase 5 (Conflict Resolution UI):** Established UX patterns for conflict dialogs; existing conflict detection provides foundation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | googleapis actively maintained (v171, updated 4 days ago), Next.js 16 + Supabase is proven architecture, date-fns-tz handles timezones reliably. MEDIUM for drag library choice—@dnd-kit/react vs pragmatic-drag-and-drop requires testing to validate React 19 compatibility. |
| Features | HIGH | Extensive competitive analysis (TrainingPeaks, Strava, Morgen, Reclaim.ai) reveals clear gap in market. Table stakes features well-documented in multiple calendar app sources. Ironman-specific needs validated through domain expertise. |
| Architecture | HIGH | Next.js 16 App Router patterns official and documented. OAuth with Supabase Vault follows security best practices. Optimistic UI with useOptimistic is React 19 standard. Hybrid sync (webhooks + polling fallback) is proven pattern. Load calculation architecture extends existing plan generation. |
| Pitfalls | HIGH | All 7 critical pitfalls sourced from documented failures (OAuth token expiry, DST bugs, LWW data loss, rate limits, accessibility violations, race conditions, RRULE complexity). Mitigation strategies validated through official sources (RFC 9700 for token rotation, WCAG 2.2 for accessibility, Google Calendar API docs for rate limits). |

**Overall confidence:** HIGH

Research is comprehensive with official documentation for core technologies (Google Calendar API, Next.js 16, React 19, WCAG 2.2), competitive analysis for features (calendar apps, training platforms), and documented pitfall cases (OAuth failures, timezone bugs, sync conflicts). Primary uncertainty is drag library choice—requires immediate testing to validate React 19 compatibility.

### Gaps to Address

- **@dnd-kit/react React 19 compatibility:** Library is actively maintained (updated 3 hours ago per search) but lacks extensive community validation with React 19 + Next.js 16. **Mitigation:** Test drag-drop immediately in Phase 4 planning; have pragmatic-drag-and-drop as documented fallback if issues arise. This is acceptable risk—both libraries support React 19, choice is between simpler API (@dnd-kit) vs proven scale (pragmatic).

- **Queue processing infrastructure:** Supabase Edge Functions vs Vercel Cron trade-offs need comparison for this specific use case. **Mitigation:** Research during Phase 2 planning when queue architecture is defined. Both approaches are production-ready; choice affects cost and concurrency, not feasibility.

- **Conflict resolution UX patterns:** Established patterns exist (last-write-wins, manual merge, automatic merge) but need adaptation for training context (workout time vs completion status vs notes). **Mitigation:** Research during Phase 5 planning. Foundation established in Phase 1 (field-level merge strategy), Phase 5 adds user-facing UI.

- **Google Calendar webhook reliability:** Google documentation notes webhooks are "not 100% reliable" (documented limitation) but doesn't quantify reliability. **Mitigation:** Implement polling fallback (every 15-30 min) as documented in Phase 3. Webhook failures logged for monitoring. This is acceptable—webhooks reduce polling by 98.5%, fallback ensures consistency.

- **Training load calculation performance:** Load recalculation on every workout mutation could become bottleneck with large training plans (>200 workouts). **Mitigation:** Load calculation is pure function of scheduled workouts (sum minutes by discipline, compare to target)—testing with 500-workout plan will validate performance. If slow, implement memoization or incremental calculation. This is low risk—calculation is simple aggregation.

## Sources

### Primary (HIGH confidence)

**Google Calendar Integration:**
- [Google Calendar API Overview](https://developers.google.com/workspace/calendar/api/guides/overview) — OAuth flows, event CRUD, push notifications, quotas
- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push) — Webhook setup, channel management, signature verification
- [Google Calendar API Quotas](https://developers.google.com/workspace/calendar/api/guides/quota) — Rate limits (1M/day, 60/min/user), batch operations, exponential backoff
- [Google Calendar API Sync Guide](https://developers.google.com/workspace/calendar/api/guides/sync) — Incremental sync with sync_token, conflict detection
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2/web-server) — PKCE, offline access, refresh token security

**Next.js 16 & React 19:**
- [Next.js 16 Release](https://nextjs.org/blog/next-16) — App Router patterns, dynamic defaults, Server Actions
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) — Optimistic UI with Server Actions
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) — Type-safe mutations, revalidation

**Security & OAuth:**
- [RFC 9700 - OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/rfc9700/) — Token rotation, reuse detection, January 2025 standard
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault) — Authenticated encryption with libsodium, automatic key management
- [Token Security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security) — Server-side token storage, RLS policies

**Accessibility:**
- [WCAG 2.2 Success Criterion 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) — Single-pointer alternative requirement (new 2023)
- [4 Major Patterns for Accessible Drag and Drop](https://medium.com/salesforce-ux/4-major-patterns-for-accessible-drag-and-drop-1d43f64ebf09) — Keyboard navigation, screen readers, ARIA labels
- [@dnd-kit Documentation](https://docs.dndkit.com) — Built-in accessibility features

**Timezone Handling:**
- [IANA Time Zone Database](https://www.iana.org/time-zones) — Timezone names, DST rules
- [RFC 5545 - iCalendar Specification](https://icalendar.org/iCalendar-RFC-5545/) — DTSTART with TZID, RRULE, RECURRENCE-ID exceptions

### Secondary (MEDIUM confidence)

**Calendar Integration:**
- [Best Calendar Management Tools 2026 - Morgen](https://www.morgen.so/blog-posts/best-calendar-management-tools) — Competitive analysis (Morgen, Reclaim.ai, OneCal)
- [Calendar Webhook Integration Guide](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/) — Webhook vs polling (98.5% reduction), implementation patterns
- [Nylas Calendar Integration Best Practices](https://www.nylas.com/blog/best-practices-for-integrating-calendar-functionality-into-your-app/) — Multi-calendar sync, conflict resolution strategies

**Drag-Drop Libraries:**
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — Comparison (@dnd-kit, pragmatic-drag-and-drop, react-beautiful-dnd)
- [@dnd-kit/react npm](https://www.npmjs.com/package/@dnd-kit/react) — v0.2.4, actively maintained (updated recently)
- [pragmatic-drag-and-drop GitHub](https://github.com/atlassian/pragmatic-drag-and-drop) — Production usage (Trello, Jira), performance focus

**Training Apps:**
- [Best Features of TrainingPeaks, Strava, Garmin Connect](https://www.fasttalklabs.com/training/the-best-features-of-trainingpeaks-strava-and-garmin-connect/) — Competitive feature analysis
- [TrainingPeaks and Strava Sync](https://help.trainingpeaks.com/hc/en-us/articles/204070254-How-do-I-sync-my-workout-data-from-Strava-into-TrainingPeaks) — Manual export limitation

**Conflict Resolution:**
- [Conflict Resolution Strategies in Data Synchronization](https://mobterest.medium.com/conflict-resolution-strategies-in-data-synchronization-2a10be5b82bc) — Last-write-wins, field-merge, operational transformation
- [How to Implement Last-Write-Wins](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view) — LWW limitations, data loss scenarios

**Training Load:**
- [Training Load Calculation Algorithms](https://forum.intervals.icu/t/training-load-calculation/423) — TSS, duration-based load, discipline ratios
- [Garmin Training Load Guide](https://runningwithrock.com/garmin-training-load/) — Weekly load monitoring, overtraining prevention

### Tertiary (LOW confidence)

- [Understanding Optimistic UI](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/) — Community guide (needs validation with official React docs)
- [Achieving Smooth Scrolling in React with TanStack Virtual](https://borstch.com/blog/development/achieving-smooth-scrolling-in-react-with-tanstack-virtual-best-practices) — Performance optimization (defer to Phase 3+)

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
