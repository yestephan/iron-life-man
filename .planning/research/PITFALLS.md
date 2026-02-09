# Pitfalls Research

**Domain:** Calendar Integration + Drag-Drop Workout Rescheduling
**Researched:** 2026-02-09
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Naive Last-Write-Wins Sync Leads to Data Loss

**What goes wrong:**
User edits workout in Google Calendar (changes time from 6am to 7am). Simultaneously, app recalculates training load and updates same workout (marks it complete). Last-write-wins picks one change, silently discarding the other. User's time change disappears or completion status vanishes.

**Why it happens:**
Last-Write-Wins is the simplest conflict resolution strategy—compare timestamps, keep the newest. Teams choose it because "users won't edit in both places at once" (they will). LWW loses information by design—only one edit survives.

**How to avoid:**
- Implement field-level merge strategy instead of document-level LWW
- Preserve both changes when fields don't overlap (time change + completion status can both survive)
- Use optimistic locking with version numbers to detect concurrent edits
- Show conflict UI when merge is ambiguous (both changed same field)
- For training apps specifically: separate "user editable" fields (time, notes) from "system computed" fields (load calculations) to reduce collision surface

**Warning signs:**
- Users report "my changes keep disappearing"
- Support tickets about calendar edits not sticking
- Complaints that workout completions get lost
- Database shows high rate of sync overwrites (audit log reveals pattern)

**Phase to address:**
Phase 1 (Foundation/Core Sync Engine) - Conflict resolution architecture must be designed upfront, not bolted on later. Changing from LWW to field-merge after launch requires data migration and user re-education.

---

### Pitfall 2: OAuth Token Expiry Causes Silent Sync Failures

**What goes wrong:**
Google Calendar integration works perfectly for 7 days, then sync stops. No error shown to user. Workouts disappear from calendar. User discovers problem when they miss a session that "wasn't on my calendar." Testing mode OAuth clients auto-expire after 7 days; refresh tokens fail without notification; app keeps trying stale tokens instead of triggering re-auth.

**Why it happens:**
- Google OAuth clients in "testing" mode expire connections after 7 days automatically
- Access tokens expire in 15-30 minutes (expected), refresh tokens can expire or be revoked (unexpected)
- Poor error handling treats "401 Unauthorized" as transient network error, retries indefinitely
- No user-facing indicator that sync is broken—background process fails silently

**How to avoid:**
- **Publishing OAuth App:** Move OAuth client to "published" status before launch (testing mode for dev only)
- **Refresh Token Rotation:** Implement RFC 9700 best practices (January 2025 standard): rotate refresh tokens on every use, detect reuse as security event, invalidate token families on breach
- **Graceful Degradation UI:** Show sync status indicator in app ("Last synced: 2 hours ago" with error state "Sync failed - reconnect")
- **Proactive Re-auth:** When refresh fails, immediately prompt user to re-authenticate (don't wait for them to notice)
- **Token Lifetime Monitoring:** Set alerts when refresh token age approaches 7 days (prompt re-auth before expiry)
- **Exponential Backoff:** Use truncated exponential backoff for retries (not infinite retry loop)

**Warning signs:**
- Background sync jobs showing 401 errors in logs
- Refresh token API calls failing
- Users report "calendar stopped updating"
- Spike in support tickets exactly 7 days after user signups
- Monitoring shows increasing time since last successful sync

**Phase to address:**
- Phase 1 (OAuth Foundation): Token rotation architecture, error handling, re-auth flow
- Phase 2 (Sync Engine): Sync status UI, monitoring/alerts, graceful degradation

---

### Pitfall 3: Timezone Handling with UTC Storage Breaks DST Transitions

**What goes wrong:**
Workout scheduled for "6am every Monday" in America/New_York. Stored as UTC offset (-05:00 or -04:00 depending on DST). When DST transitions, recurring event shifts from 6am to 5am or 7am because UTC offset changed but stored time didn't. User's morning routine breaks—alarm set for 6am but workout now at 5am.

**Why it happens:**
- Storing UTC offsets (EST = -05:00) instead of IANA timezone names ("America/New_York")
- UTC offsets don't encode DST rules—they're snapshots of current offset
- Recurring events (RRULE) require timezone-aware DTSTART, not UTC timestamps
- "Fall back" hour during DST creates ambiguous times (1:30am happens twice)

**How to avoid:**
- **Store IANA Timezone Names:** Use "America/New_York" not "EST" or "-05:00"
- **UTC Database + Local Display:** Store all times in UTC, but always include source timezone name for display rendering
- **DTSTART with Timezone Reference:** iCalendar RRULE requires `DTSTART;TZID=America/New_York:20260309T060000` format (not UTC)
- **DST Transition Testing:** Test recurring events that span DST boundaries (March/November in US)
- **Ambiguous Time Resolution:** During "fall back," default to first occurrence of ambiguous hour (document this behavior)
- **User Timezone Detection:** Detect user's timezone at schedule time, not at sync time (preserve intent)

**Warning signs:**
- Support tickets spike around DST transitions (March/November)
- Users report "my 6am workout moved to 5am"
- Recurring events show inconsistent times across months
- Calendar import/export produces wrong times in other apps
- Training load calculations show workouts at impossible times (3am when user never trains before 6am)

**Phase to address:**
Phase 1 (Data Model): Timezone storage architecture—switching from UTC-only to UTC+timezone later requires data migration and may cause historical data issues.

---

### Pitfall 4: Google Calendar API Rate Limits Hit Without Backoff

**What goes wrong:**
User reschedules 20 workouts via drag-drop in quick succession. Each drag triggers API call to update Google Calendar. After 10 updates, app hits rate limit (60 queries per minute per user). All subsequent updates fail with 403/429 errors. UI shows success but calendar never updates. User reports "drag-drop worked for a few, then stopped."

**Why it happens:**
- Google Calendar API enforces quotas per-project and per-user (sliding 60-second window)
- Burst traffic—rapid succession of API calls—exceeds per-minute quota even if daily limit is nowhere near
- No client-side batching or debouncing of rapid updates
- Immediate retry after 429 response makes problem worse (keeps hitting limit)
- UI doesn't wait for API confirmation before showing success state

**How to avoid:**
- **Batch Updates:** Queue multiple changes, send as single API request (Calendar API supports batch operations)
- **Debouncing:** Wait 500ms after last drag operation before sending update (user might drag again)
- **Rate Limit Respect:** Implement exponential backoff on 429/403 responses (start with 1s, double each retry, max 32s)
- **Optimistic UI with Rollback:** Show change immediately, but revert if API fails (with error toast)
- **Request Coalescing:** If user drags same workout 3 times in 10 seconds, send only final position
- **Local Cache:** Update local state immediately, sync to API in background with retry queue
- **Quota Monitoring:** Track API quota usage, warn user when approaching limit ("slow down" message)

**Warning signs:**
- Logs show 429 "rateLimitExceeded" or 403 "usageLimits" errors
- API errors spike during peak usage hours (morning when users plan week)
- Support tickets about "changes not saving to calendar"
- Users report "only first few changes work"
- Monitoring shows API call rate approaching 1 req/second sustained

**Phase to address:**
- Phase 2 (Drag-Drop Implementation): Debouncing and batching must be part of initial implementation
- Phase 3 (Scale Optimization): Quota monitoring, advanced retry strategies, request coalescing

---

### Pitfall 5: Drag-Drop Inaccessible to Keyboard/Screen Reader Users

**What goes wrong:**
User with motor disability relies on keyboard navigation. Workout schedule only supports drag-drop interaction. No keyboard alternative (arrow keys, context menu, "move to" dialog). WCAG 2.2 Success Criterion 2.5.7 violation. Screen reader users hear workout list but can't reorder items. App unusable for ~15% of potential users.

**Why it happens:**
- WCAG 2.2 SC 2.5.7 "Dragging Movements" (new 2023) requires single-pointer alternative to drag actions
- Developers test with mouse only, don't verify keyboard navigation or screen reader compatibility
- Popular drag-drop libraries (dnd-kit, hello-pangea/dnd) require explicit accessibility configuration
- Touchscreen-first design assumes all users can drag
- Accessibility treated as "Phase 2" feature instead of requirement

**How to avoid:**
- **Keyboard Navigation:** Implement Tab (focus item) + Arrow keys (move up/down) + Enter (drop)
- **Alternative UI Patterns:**
  - Up/down arrow buttons next to each workout
  - Context menu: "Move to Monday", "Move to 6:00am", "Swap with next"
  - "Move to position" dropdown (select target day/time)
- **Screen Reader Announcements:** "Workout moved from Tuesday to Thursday" confirmation
- **Focus Management:** After move, focus stays on moved item (don't lose position)
- **ARIA Labels:** `aria-label="Reorder workouts"`, `aria-grabbed="true"` during drag
- **Library Choice:** Use dnd-kit (accessibility built-in) over hello-pangea/dnd (requires manual setup)
- **Testing Protocol:** Every PR must pass keyboard-only test and screen reader test

**Warning signs:**
- Accessibility audit fails WCAG 2.2 SC 2.5.7
- Users request "add arrow buttons" or "keyboard support"
- Support tickets from assistive technology users
- High bounce rate from accessibility-focused user segments
- Can't complete drag-drop action with keyboard alone

**Phase to address:**
Phase 2 (Drag-Drop UI): Accessibility must be built into initial implementation. Retrofitting keyboard controls onto mouse-only UI requires significant rework and different state management.

---

### Pitfall 6: Training Load Recalculation Bugs from Concurrent Edits

**What goes wrong:**
User drags workout from Monday to Wednesday. App recalculates weekly training load: Monday's load decreases, Wednesday's increases. While recalculation runs (500ms), user drags different workout to Monday. Second recalculation overwrites first. Final state: Monday shows wrong load (missing one workout), Wednesday correct. Weekly totals don't sum to individual days.

**Why it happens:**
- Recalculation is async (0.5-2s for complex programs) but UI allows immediate next action
- Race condition: second calculation starts before first completes, both write to database
- Database writes not atomic—load update separate from workout move
- Optimistic UI shows new load immediately, doesn't wait for calculation to complete
- No locking mechanism prevents concurrent modifications to same day

**How to avoid:**
- **Atomic Transactions:** Wrap workout move + load recalculation in single database transaction
- **Optimistic Locking:** Use version numbers on daily load records, reject stale updates
- **Calculation Queue:** Serialize load recalculations per user (don't allow concurrent)
- **Debouncing:** Wait for drag activity to stop before recalculating (user might drag 5 workouts in 10s)
- **Eventual Consistency:** Accept temporary inconsistency, background job reconciles every 10 minutes
- **State Machine:** Track calculation status (idle → calculating → complete), block new calcs during active one
- **Idempotent Recalculation:** Make recalc pure function of current state, safe to re-run

**Warning signs:**
- Load numbers fluctuate when refreshing page
- Weekly totals don't match sum of daily loads
- Users report "my weekly load keeps changing"
- Race condition errors in logs ("optimistic lock exception", "serialization failure")
- Database shows multiple updates to same record with same timestamp

**Phase to address:**
Phase 2 (Drag-Drop + Load Recalculation): Race condition handling must be designed upfront. Fixing this after launch while preserving user data requires complex migrations.

---

### Pitfall 7: Recurring Event Modification Creates RRULE Chaos

**What goes wrong:**
User has recurring workout: "Run 5K every Monday at 6am" (RRULE). User drags one instance from Monday to Tuesday (reschedules due to injury). App doesn't properly handle RRULE overrides—either (1) moves ALL future Mondays to Tuesday (wrong), or (2) breaks recurrence entirely (also wrong), or (3) creates 52 individual events filling up database (bad). Google Calendar shows wrong schedule.

**Why it happens:**
- iCalendar RRULE modification requires creating RECURRENCE-ID exceptions for single-instance edits
- Simple approach: delete RRULE, create individual events (database bloats for long series)
- Wrong approach: modify RRULE itself (changes all future instances when user meant one)
- Override mechanism poorly documented in RFC 5545
- Long-running recurring events with many overrides become huge (interoperability problems)

**How to avoid:**
- **RECURRENCE-ID Exceptions:** When modifying one instance, create exception event with RECURRENCE-ID matching original start time
- **"This or All Future" UI:** Ask user: "Change this workout only or all future workouts?"
- **Exception Limit:** Warn if recurring event has >50 exceptions ("Consider creating new schedule")
- **RRULE Testing:** Test modification of first, middle, last instance plus DST boundary instances
- **Sync to Google Calendar:** Verify Google Calendar correctly displays master + exceptions
- **Database Design:** Store master RRULE + exceptions separately (not expanded instance list)

**Warning signs:**
- Database shows thousands of events for simple recurring schedule
- "Edit recurring workout" modifies all instances unintentionally
- Google Calendar shows different schedule than app
- Users report "my recurring workout disappeared"
- Sync process times out due to large event payloads

**Phase to address:**
Phase 2 (Recurring Workouts): RRULE exception handling must be implemented with drag-drop. Bolting it on later requires reworking event storage schema.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store events as UTC timestamps only (no timezone) | Simple data model, easier queries | DST breaks recurring events, impossible to fix without data migration | Never—timezone names are required |
| Refresh token without rotation | Easier implementation | Security vulnerability (token reuse undetected), non-compliant with RFC 9700 | Never in production (testing only) |
| Last-write-wins conflict resolution | Simple to implement, no UI for conflicts | Data loss when concurrent edits, user frustration, high support load | MVP only if documented as known limitation |
| Immediate API call on each drag operation | Real-time sync, no queue complexity | Rate limits, poor performance, wasted API quota | Never—debouncing is essential |
| Mouse-only drag-drop (no keyboard support) | Faster initial development | WCAG violation, excludes users, legal risk | Never—accessibility is requirement not feature |
| Expand RRULE to individual events in database | Simple to query, no RRULE parsing | Database bloat, slow sync, modification complexity | Short-term series only (<10 instances) |
| No optimistic UI (wait for API confirmation) | Guaranteed consistency, simpler state | Slow UX (500ms delay per action), feels laggy | Never—optimistic UI is table stakes |
| Hardcode OAuth client in testing mode | Quick setup, no Google approval process | Connections expire after 7 days, user churn | Dev/staging only (never production) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Calendar API | Storing credentials.json in client-side code or git repo | Store in server environment variables, never commit to repo, use server-side OAuth flow |
| OAuth Redirect URI | Using `http://localhost` in production or mismatched URIs | Exact match required (trailing slash matters), configure all environments in Google Console |
| Calendar Event DTSTART | Using UTC timestamp for recurring events | Use local time with TZID parameter: `DTSTART;TZID=America/New_York:20260309T060000` |
| Refresh Token Storage | Saving tokens in localStorage or cookies | Store in server-side encrypted database, never client-side (security risk) |
| API Scope Requests | Requesting `calendar` scope (full access) when only need read | Use minimal scopes (`calendar.events.readonly` for read, `calendar.events` for write), incremental authorization |
| Sync Direction Indicator | No UI showing which direction sync flows | Clear "Last synced to Google Calendar: 2 min ago" with direction arrows (app → calendar or ↔) |
| Event Modification Detection | Polling for changes every minute (wasteful) | Use Google Calendar API push notifications (webhooks) for real-time updates, fallback to polling |
| Timezone Caching | Caching timezone data that becomes stale | Use IANA timezone database (tzdata), update regularly (DST rules change), don't hardcode offsets |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rendering all calendar events in DOM | Page load >5s, janky scrolling, browser freezes | Virtual scrolling (react-window or TanStack Virtual), render only visible week | >200 events total |
| Recalculating training load on every keystroke | Input lag, high CPU usage, battery drain on mobile | Debounce (500ms) or calculate on blur/submit only | Any workout edit |
| Fetching entire calendar history on load | 10s+ initial load time, large API payload (5+ MB) | Lazy load: fetch current week + 2 weeks ahead/behind, load more on scroll | >6 months of events |
| No batching for drag-drop operations | Rate limits, slow multi-drag, wasted API calls | Queue updates, batch send every 2s or after drag session ends | >10 drags in 60s |
| Synchronous calendar sync blocking UI | App freezes during sync, poor mobile experience | Background sync worker (Web Workers or Service Workers), async operations with loading states | Any sync operation |
| Storing expanded RRULE instances (all events) | Database bloat (GB for years of data), slow queries | Store RRULE + exceptions only, expand on-demand for display | >1 year recurring events |
| Missing React.memo() on calendar grid cells | Re-render entire month on single event change | React.memo() on cell components, useCallback for handlers, memoize expensive calculations | >50 events visible |
| No request coalescing for rapid edits | Network spam, quota waste, inconsistent final state | Coalesce identical requests in-flight, cancel previous if new arrives | Any rapid editing |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing OAuth tokens in localStorage | Token theft via XSS, persistent access for attacker | Store tokens in httpOnly secure cookies or server-side session, never localStorage |
| No token rotation on refresh | Stolen refresh token valid indefinitely, undetected reuse | Implement RFC 9700 token rotation (new refresh token on each use), detect reuse as breach signal |
| Logging sensitive data (tokens, workout details) | Credentials leaked in logs, privacy violation (HIPAA risk for training data) | Scrub tokens from logs, redact user data, use structured logging with explicit allow-list |
| No scope validation on API calls | Attacker with read token escalates to write access | Verify token scopes match operation, fail closed on scope mismatch, re-auth for elevated scopes |
| Trusting client-side time for scheduling | User manipulates device clock to bypass rate limits or scheduling rules | Use server time for all business logic, client time for display only |
| No PKCE for OAuth flow | Authorization code interception attack (mobile apps) | Mandatory PKCE (RFC 9700) for all OAuth flows, not just public clients |
| Calendar data in server logs | Sensitive workout data (medications, injuries) exposed in logs | Treat calendar events as sensitive PII, log event IDs only (not content), encrypt logs at rest |
| No rate limiting on sync endpoint | Attacker spams sync, burns API quota, DoS attack | Rate limit per user (10 sync requests/hour), implement circuit breaker for repeated failures |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Drag-drop with no visual feedback | User uncertain if drag worked, repeats action, creates duplicates | Highlight drop zones on drag start, animate item movement, show success confirmation toast |
| Silent sync failures | User discovers missing workouts when they miss a session (trust erosion) | Prominent sync status indicator ("⚠️ Sync failed - tap to fix"), proactive error notifications |
| No "undo" for drag-drop | Accidental drag, user panics, can't recover easily | Toast with "Undo" button (5s timeout), persist undo history for session, CMD+Z keyboard shortcut |
| Blocking calendar integration behind signup | User can't evaluate feature, unsure if worth signing up | Preview mode: show mockup of calendar integration, explain benefits, seamless upgrade after signup |
| Confusing sync direction (one-way vs two-way) | User edits in wrong place, changes don't appear where expected | Clear UI: "Two-way sync enabled ↔️" vs "Read-only ➡️", tooltip explaining sync behavior |
| No conflict resolution UI | Silent data loss when conflicts occur, user never knows what happened | Show conflict dialog: "You changed X in app, but Y in Google Calendar. Keep which version?" |
| Load recalculation without explanation | Numbers change mysteriously, user distrusts algorithm | Show calculation breakdown on hover/tap: "Weekly load: 450 TSS (Mon: 100, Wed: 150, Fri: 200)" |
| Timezone assumptions (app assumes user's current TZ) | Traveling user sees wrong times, training schedule disrupts | Ask timezone at schedule creation: "Schedule this workout in [America/New_York ▼]" |
| Calendar clutter (every workout as separate event) | User's calendar overwhelmed with 14+ training events/week | Option to consolidate: "Show as daily summary events" vs "Individual workout events" |
| No guidance on multi-device training | User trains on watch, logs on phone, views on web—confused where to edit | "Edit here" vs "Read-only" badges on each device, sync status per device, explicit source of truth |

## "Looks Done But Isn't" Checklist

- [ ] **OAuth Integration:** Often missing refresh token rotation—verify token invalidation on reuse detection (RFC 9700 compliance)
- [ ] **Calendar Sync:** Often missing conflict resolution UI—verify what happens when user edits same event in both systems
- [ ] **Drag-Drop UI:** Often missing keyboard navigation—verify Tab + Arrow keys + Enter works without mouse
- [ ] **Timezone Handling:** Often missing IANA timezone names—verify storage includes timezone (not just UTC offset)
- [ ] **Rate Limiting:** Often missing exponential backoff—verify 429 responses trigger increasing delays (not immediate retry)
- [ ] **Load Recalculation:** Often missing race condition handling—verify concurrent drags don't corrupt load totals
- [ ] **Recurring Events:** Often missing RECURRENCE-ID exceptions—verify editing one instance doesn't modify all future
- [ ] **Sync Status UI:** Often missing error states—verify failed sync shows user-facing error (not just log entry)
- [ ] **Accessibility:** Often missing screen reader support—verify ARIA labels and keyboard-only workflow
- [ ] **DST Transitions:** Often missing DST testing—verify recurring events stable across March/November transitions
- [ ] **API Batching:** Often missing request coalescing—verify rapid drags send batched update (not 20 individual calls)
- [ ] **Optimistic Locking:** Often missing version checks—verify concurrent edits from multiple devices handled correctly

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Last-write-wins data loss | HIGH | No recovery—lost data unrecoverable. Mitigation: audit log for investigation, apology to users, implement field-merge going forward |
| OAuth token expiry | LOW | Trigger re-auth flow immediately, show friendly message ("Reconnect to sync"), user clicks one button |
| Timezone DST bug | MEDIUM | Data migration: add timezone column, infer from user profile/IP, update all future events, notify users to verify schedules |
| Rate limit exhaustion | LOW | Exponential backoff automatically recovers in 1-5 minutes, implement request queue to prevent recurrence |
| Accessibility violation | HIGH | Significant UI rework required, add keyboard nav + ARIA, retest all flows, document keyboard shortcuts |
| Load recalculation race | MEDIUM | Background reconciliation job: detect inconsistencies, recalculate from source of truth (workouts), notify user if large discrepancy |
| RRULE override chaos | HIGH | Depends on corruption extent: minor (recreate exceptions), major (user must reschedule), data migration complex |
| Drag-drop performance | MEDIUM | Implement virtual scrolling (react-window), requires refactoring calendar grid component, add memoization |
| Sync conflict silent loss | MEDIUM | Show conflict retroactively: "We detected a conflict on [date]. Review now?" Let user pick version to keep |
| Calendar clutter | LOW | Add "consolidate events" option, batch update Google Calendar (delete individual, create daily summaries) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Last-write-wins data loss | Phase 1 (Sync Foundation) | Concurrent edit test: edit same workout in app + Google Calendar simultaneously, verify both changes preserved (field-merge) |
| OAuth token expiry | Phase 1 (Auth Foundation) | Token rotation test: use refresh token twice, verify second use invalidates both (reuse detection works) |
| Timezone DST bugs | Phase 1 (Data Model) | DST transition test: create recurring 6am workout, verify time stable across March DST boundary (stays 6am, not 5am) |
| Rate limit exhaustion | Phase 2 (Drag-Drop) | Burst test: drag 30 workouts in 30 seconds, verify batching (not 30 API calls), graceful queueing (no 429 errors) |
| Accessibility violations | Phase 2 (Drag-Drop UI) | Keyboard-only test: complete workout rescheduling with keyboard alone (no mouse), screen reader announces actions |
| Load recalculation race | Phase 2 (Drag-Drop + Load) | Concurrent drag test: drag 2 workouts to same day in quick succession, verify final load = sum of both workouts |
| RRULE override chaos | Phase 2 (Recurring Events) | Exception test: modify one instance of recurring workout, verify (1) only that instance changes, (2) Google Calendar matches |
| Drag-drop performance | Phase 3 (Optimization) | Performance test: 500 events in calendar, drag one workout, verify <100ms response (virtual scrolling working) |
| Sync conflict silent loss | Phase 1 (Sync Foundation) | Conflict UI test: force conflict scenario, verify dialog shows both versions, user can choose which to keep |
| Calendar clutter | Phase 3 (Polish) | User preference test: toggle "daily summary" mode, verify Google Calendar consolidates 5 workouts → 1 event |

## Sources

### OAuth & Security
- [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Troubleshoot authentication & authorization issues | Google Calendar](https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization)
- [OAuth 2.0 Refresh Token Best Practices](https://stateful.com/blog/oauth-refresh-token-best-practices)
- [RFC 9700 - Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/rfc9700/)
- [Refresh Token Rotation - Auth0 Docs](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [Hardening OAuth Tokens in API Security](https://www.clutchevents.co/resources/hardening-oauth-tokens-in-api-security-token-expiry-rotation-and-revocation-best-practices)

### Calendar Sync & Conflicts
- [How to Fix Outlook Calendar Not Syncing - Complete Guide for 2026](https://calendarbridge.com/blog/how-to-fix-outlook-calendar-not-syncing-a-complete-guide/)
- [How to Fix a Google Calendar that's Not Syncing](https://calendarbridge.com/blog/how-to-fix-a-google-calendar-thats-not-syncing/)
- [How to Implement Last-Write-Wins](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view)
- [Conflict resolution strategies in Data Synchronization](https://mobterest.medium.com/conflict-resolution-strategies-in-data-synchronization-2a10be5b82bc)
- [How To Resolve Calendar Sync Conflicts In Digital Scheduling Tools](https://www.myshyft.com/blog/conflict-resolution-3/)

### Rate Limits & API Management
- [Manage quotas | Google Calendar](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Handle API errors | Google Calendar](https://developers.google.com/workspace/calendar/api/guides/errors)
- [The Google Calendar API has changed how we manage API usage](https://developers.googleblog.com/the-google-calendar-api-has-changed-how-we-manage-api-usage/)

### Drag-Drop Performance
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [GitHub - react-virtualized-dnd](https://github.com/Forecast-it/react-virtualized-dnd)
- [Achieving Smooth Scrolling in React with TanStack Virtual](https://borstch.com/blog/development/achieving-smooth-scrolling-in-react-with-tanstack-virtual-best-practices)

### Accessibility
- [Are Drag and Drop functions allowed by WCAG?](https://accessibleweb.com/question-answer/are-drag-and-drop-functions-allowed-by-wcag/)
- [10 Tips for Accessible Drag-and-Drop Interfaces](https://www.fleexy.dev/blog/10-tips-for-accessible-drag-and-drop-interfaces/)
- [Understanding Success Criterion 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [The Road to Accessible Drag and Drop (Part 1)](https://www.tpgi.com/the-road-to-accessible-drag-and-drop-part-1/)
- [4 Major Patterns for Accessible Drag and Drop](https://medium.com/salesforce-ux/4-major-patterns-for-accessible-drag-and-drop-1d43f64ebf09)

### Timezone Handling
- [Essential Time Zone Handling For Digital Scheduling Success](https://www.myshyft.com/blog/calendar-time-zone-formatting/)
- [HighLevel Timezone API: Complete Integration Guide 2026](https://ghlbuilds.com/highlevel-timezone-api/)
- [Working With Timezones - Knowledgebase](https://theeventscalendar.com/knowledgebase/working-with-time-zones/)
- [Time Zones | Calendars & Events | Cronofy Docs](https://docs.cronofy.com/developers/calendars-events/time-zones/)

### RRULE & Recurring Events
- [The Deceptively Complex World of Calendar Events and RRULEs](https://www.nylas.com/blog/calendar-events-rrules/)
- [iCalendar.org - Recurrence Rule](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html)
- [Recurrences - CalConnect Developer Guide](https://devguide.calconnect.org/iCalendar-Topics/Recurrences/)
- [How to create recurring events using RRule](https://www.nylas.com/blog/create-recurring-events-using-rrule-dev/)

### Training App Integrations
- [8 Best Gym Software with Calendar Integration in 2026](https://www.exercise.com/grow/best-gym-software-with-calendar-integration/)
- [Fitness App Development in 2026: Key Features, Monetization Models, and Cost Estimates](https://attractgroup.com/blog/fitness-app-development-in-2026-key-features-monetization-models-and-cost-estimates/)

---
*Pitfalls research for: Iron Life Man - Calendar Integration + Drag-Drop Workout Rescheduling*
*Researched: 2026-02-09*
