# Phase 1 Plan Verification Report

**Phase:** 1 - OAuth Foundation  
**Goal:** Users can securely connect their Google Calendar with proper timezone handling for training data  
**Plans Verified:** 4 (01-01, 01-02, 01-03, 01-04)  
**Verification Date:** 2026-02-12  
**Status:** PASSED ✓

---

## Executive Summary

All Phase 1 plans successfully address the phase goal and requirements. The plans deliver:

1. Secure OAuth 2.0 flow with CSRF protection and encrypted token storage
2. Calendar selection during onboarding with "Iron Life Man" calendar creation
3. Automatic token refresh with persistent storage
4. IANA timezone support in data model
5. Connection status visibility across dashboard and settings

**Verdict:** Plans WILL achieve the phase goal. Proceed to execution.

---

## Goal-Backward Verification

### Success Criterion 1: OAuth Authorization Flow

**REQUIREMENT:** User can authorize Iron Life Man to access their Google Calendar through OAuth flow

**COVERAGE ANALYSIS:**

**Plan 01-02** (OAuth flow):
- Task 2 creates `/api/auth/google/authorize` route ✓
- Task 2 creates `/api/auth/google/callback` route ✓
- OAuth2Client configured with `access_type: 'offline'` and `prompt: 'consent'` ✓
- CSRF state validation with httpOnly cookies ✓
- Proper error handling (denial, invalid state, missing code) ✓

**Plan 01-03** (Calendar selection):
- Task 2 creates onboarding page with "Connect Google Calendar" button ✓
- Button links to `/api/auth/google/authorize` ✓
- Permissions explanation shown before OAuth redirect ✓

**WIRING:**
- Onboarding page → Authorize route → Google OAuth → Callback route → Calendar selection
- User decisions honored: permissions transparency, OAuth denial = skip, optional with skip

**STATUS:** COVERED ✓

---

### Success Criterion 2: Calendar Selection During Setup

**REQUIREMENT:** User can select which calendar to write workouts to during connection setup

**COVERAGE ANALYSIS:**

**Plan 01-03** (Calendar operations):
- Task 1 creates `listWritableCalendars()` Server Action with `minAccessRole='writer'` ✓
- Task 1 creates `createIronLifeManCalendar()` Server Action with user's timezone ✓
- Task 1 creates `selectCalendar()` Server Action updating integrations table ✓
- Task 2 creates calendar-connect onboarding page with two-step flow:
  - Step 1 (connect): Permissions explanation + OAuth button ✓
  - Step 2 (select): Calendar dropdown + "Create Iron Life Man Calendar" button ✓
- Dropdown shows only writable calendars (minAccessRole filter) ✓
- "Iron Life Man" calendar pre-selected after creation ✓

**WIRING:**
- OAuth callback redirects to `?step=select` ✓
- Selection page calls `listWritableCalendars()` on mount ✓
- Create button calls `createIronLifeManCalendar()` ✓
- Continue button calls `selectCalendar()` ✓
- Calendar ID stored in integrations.calendar_id ✓

**USER DECISIONS HONORED:**
- Dropdown list for selection ✓
- Only writable calendars shown ✓
- Create dedicated "Iron Life Man" calendar and pre-select ✓
- Optional with skip (skip button in both steps) ✓

**STATUS:** COVERED ✓

---

### Success Criterion 3: Automatic Token Refresh

**REQUIREMENT:** System automatically refreshes OAuth tokens without requiring user re-authentication

**COVERAGE ANALYSIS:**

**Plan 01-02** (OAuth flow):
- Task 2 creates `createAuthenticatedClient()` in `lib/google/oauth-client.ts` ✓
- OAuth2Client configured with user's tokens via `setCredentials()` ✓
- 'tokens' event listener attached to persist refreshed tokens ✓
- Event listener calls `updateGoogleTokens()` Server Action ✓
- Refresh happens automatically via googleapis library ✓

**Plan 01-01** (Data foundation):
- Task 1 creates `vault_update_secret` RPC wrapper for token updates ✓

**WIRING:**
- OAuth2Client.on('tokens') → updateGoogleTokens() → vault_update_secret() → Vault ✓
- Automatic refresh triggered by library when tokens approach expiry ✓
- No user intervention required ✓

**STATUS:** COVERED ✓

---

### Success Criterion 4: IANA Timezone Storage

**REQUIREMENT:** System stores all workout times with IANA timezone names (not just UTC offsets)

**COVERAGE ANALYSIS:**

**Plan 01-01** (Database schema):
- Task 1 creates migration adding `timezone VARCHAR(50)` column to workouts table ✓
- Column defaults to 'UTC' ✓
- Comment explains IANA timezone storage for DST handling ✓
- Index on workouts(timezone) for queries ✓
- Task 2 updates TypeScript types: Workout interface gains `timezone?: string` field ✓

**Plan 01-03** (Calendar operations):
- Task 1: `createIronLifeManCalendar()` fetches user's timezone from user_profiles ✓
- Calendar created with `timeZone: timezone` (IANA) ✓
- Research pitfall #6 addressed: "Always set timeZone when creating calendar" ✓

**STATUS:** COVERED ✓

---

### Success Criterion 5: Encrypted Token Storage

**REQUIREMENT:** System encrypts OAuth tokens using Supabase Vault with no tokens exposed to client

**COVERAGE ANALYSIS:**

**Plan 01-01** (Vault setup):
- Task 1 creates migration enabling Vault extension ✓
- Task 1 creates 4 RPC wrapper functions with SECURITY DEFINER:
  - `vault_create_secret()` ✓
  - `vault_read_secret()` ✓
  - `vault_update_secret()` ✓
  - `vault_delete_secret()` ✓
- All functions include auth.uid() checks ✓
- Functions granted to `authenticated` role only ✓
- Migration updates integrations table documentation (columns store Vault UUIDs) ✓

**Plan 01-02** (Token storage):
- Task 1 creates `storeGoogleTokens()` Server Action:
  - Calls `vault_create_secret()` for access_token ✓
  - Calls `vault_create_secret()` for refresh_token ✓
  - Stores Vault UUIDs (not tokens) in integrations.access_token/refresh_token ✓
- Task 1 creates `getGoogleTokens()` Server Action:
  - Retrieves Vault UUIDs from integrations table ✓
  - Calls `vault_read_secret()` to decrypt tokens ✓
  - Returns decrypted tokens (never exposed to client) ✓
- Task 1 creates `updateGoogleTokens()` calling `vault_update_secret()` ✓
- Task 1 creates `deleteGoogleTokens()` calling `vault_delete_secret()` ✓

**Plan 01-04** (Status visibility):
- Task 1: `getGoogleCalendarIntegration()` query does NOT select access_token/refresh_token ✓
- Query returns only: is_active, last_sync_status, calendar_id, etc. ✓
- No token data exposed to client components ✓

**WIRING:**
- OAuth callback → storeGoogleTokens() → vault_create_secret() → Vault (encrypted) ✓
- API calls → createAuthenticatedClient() → getGoogleTokens() → vault_read_secret() → decrypted tokens (server-side only) ✓
- Token refresh → updateGoogleTokens() → vault_update_secret() → Vault (updated) ✓
- Disconnect → deleteGoogleTokens() → vault_delete_secret() → tokens removed ✓

**STATUS:** COVERED ✓

---

## Requirement Coverage

| Requirement | Plans | Tasks | Status |
|-------------|-------|-------|--------|
| GCAL-01: OAuth authorization | 01-02, 01-03 | 02-T2, 03-T2 | COVERED |
| GCAL-02: Calendar selection | 01-03 | 03-T1, 03-T2 | COVERED |
| GCAL-10: Automatic token refresh | 01-01, 01-02 | 01-T1, 02-T2 | COVERED |
| DATA-01: IANA timezone storage | 01-01, 01-03 | 01-T1, 01-T2, 03-T1 | COVERED |
| DATA-03: Encrypted token storage | 01-01, 01-02, 01-04 | 01-T1, 02-T1, 04-T1 | COVERED |

**Coverage:** 5/5 requirements (100%)

---

## Plan Structure Validation

All plans validated with gsd-tools verify plan-structure:

**Plan 01-01:** ✓ Valid
- 2 tasks, all complete (files, action, verify, done)
- Frontmatter: phase, plan, type, wave, depends_on, files_modified, autonomous, user_setup, must_haves
- Wave 1 (no dependencies)

**Plan 01-02:** ✓ Valid
- 2 tasks, all complete (files, action, verify, done)
- Frontmatter: phase, plan, type, wave, depends_on, files_modified, autonomous, must_haves
- Wave 2 (depends_on: ["01-01"])

**Plan 01-03:** ✓ Valid
- 2 tasks, all complete (files, action, verify, done)
- Frontmatter: phase, plan, type, wave, depends_on, files_modified, autonomous, must_haves
- Wave 3 (depends_on: ["01-02"])

**Plan 01-04:** ✓ Valid
- 2 tasks, all complete (files, action, verify, done)
- Frontmatter: phase, plan, type, wave, depends_on, files_modified, autonomous, must_haves
- Wave 3 (depends_on: ["01-02"])

---

## Dependency Graph Validation

**Wave 1 (Parallel):**
- Plan 01-01: Vault setup, timezone schema

**Wave 2 (After 01-01):**
- Plan 01-02: OAuth flow (needs Vault from 01-01)

**Wave 3 (After 01-02):**
- Plan 01-03: Calendar selection (needs OAuth from 01-02)
- Plan 01-04: Connection status (needs OAuth from 01-02)

**Analysis:**
- No circular dependencies ✓
- No forward references ✓
- Wave assignments consistent with depends_on ✓
- Plans 03 and 04 can run in parallel (both depend only on 02) ✓

---

## Key Links Verification

All critical wiring verified:

**OAuth Flow:**
- Onboarding page → `/api/auth/google/authorize` (Plan 03-T2 links to Plan 02-T2) ✓
- Authorize route → Google OAuth → Callback route (Plan 02-T2 internal) ✓
- Callback route → storeGoogleTokens() (Plan 02-T2 calls Plan 02-T1) ✓
- Callback route → calendar-connect?step=select (Plan 02-T2 redirects to Plan 03-T2) ✓

**Calendar Selection:**
- Calendar-connect page → listWritableCalendars() (Plan 03-T2 calls Plan 03-T1) ✓
- Calendar-connect page → createIronLifeManCalendar() (Plan 03-T2 calls Plan 03-T1) ✓
- Calendar-connect page → selectCalendar() (Plan 03-T2 calls Plan 03-T1) ✓

**Token Management:**
- storeGoogleTokens() → vault_create_secret() (Plan 02-T1 calls Plan 01-T1 RPC) ✓
- getGoogleTokens() → vault_read_secret() (Plan 02-T1 calls Plan 01-T1 RPC) ✓
- updateGoogleTokens() → vault_update_secret() (Plan 02-T1 calls Plan 01-T1 RPC) ✓
- deleteGoogleTokens() → vault_delete_secret() (Plan 02-T1 calls Plan 01-T1 RPC) ✓

**Auto-Refresh:**
- createAuthenticatedClient() → getGoogleTokens() (Plan 02-T2 calls Plan 02-T1) ✓
- OAuth2Client 'tokens' event → updateGoogleTokens() (Plan 02-T2 calls Plan 02-T1) ✓

**Status Display:**
- Dashboard → ConnectionStatus (Plan 04-T2 renders Plan 04-T1) ✓
- Settings → CalendarSettings (Plan 04-T2 renders client component) ✓
- ConnectionStatus → getGoogleCalendarIntegration() (Plan 04-T1 query) ✓

**No missing wiring detected.** All artifacts connected.

---

## Scope Assessment

| Plan | Tasks | Files | Wave | Assessment |
|------|-------|-------|------|------------|
| 01-01 | 2 | 3 | 1 | Good (foundation) |
| 01-02 | 2 | 4 | 2 | Good (OAuth core) |
| 01-03 | 2 | 5 | 3 | Good (calendar ops) |
| 01-04 | 2 | 5 | 3 | Good (status UI) |

**Total context estimate:** ~50%

**Analysis:**
- All plans: 2 tasks each (within 2-3 target) ✓
- Files per plan: 3-5 (within 5-8 target) ✓
- No plan exceeds scope thresholds ✓
- Domain separation logical (database, OAuth, calendar, UI) ✓

**No scope issues detected.**

---

## must_haves Derivation

### Plan 01-01
**Truths:**
- "Supabase Vault extension is enabled and RPC wrapper functions exist" ✓ User-observable (can call RPCs)
- "integrations table stores Vault secret UUIDs" ✓ User-observable (tokens work)
- "TypeScript types reflect the integration model" ✓ Developer-observable (types compile)
- "workouts table has timezone column storing IANA timezone names" ✓ User-observable (timezones preserved)

**Artifacts map to truths:** ✓
**Key_links specify method:** ✓ (CREATE EXTENSION, vault.create_secret patterns)

### Plan 01-02
**Truths:**
- "Visiting /api/auth/google/authorize redirects to Google OAuth" ✓ User-observable
- "Callback exchanges code for tokens and stores encrypted" ✓ User-observable (flow completes)
- "OAuth state parameter validated" ✓ Security-observable (CSRF prevented)
- "OAuth denial treated as skip" ✓ User-observable (graceful redirect)
- "Tokens retrieved from Vault and used" ✓ User-observable (API calls work)
- "OAuth2Client automatically refreshes tokens" ✓ User-observable (no re-auth)

**Artifacts map to truths:** ✓
**Key_links specify method:** ✓ (imports, RPC calls, event listeners)

### Plan 01-03
**Truths:**
- "User can see permissions explanation" ✓ User-observable
- "User can skip calendar connection" ✓ User-observable
- "After OAuth, user sees dropdown of calendars" ✓ User-observable
- "User can create 'Iron Life Man' calendar" ✓ User-observable
- "User can select calendar and continue" ✓ User-observable
- "Calendar selection saved to integrations" ✓ User-observable (persists)
- "Onboarding flow routes correctly" ✓ User-observable (navigation works)

**Artifacts map to truths:** ✓
**Key_links specify method:** ✓ (fetch, Server Action calls, router.push)

### Plan 01-04
**Truths:**
- "User can see connection status in dashboard" ✓ User-observable
- "User can see status on settings page" ✓ User-observable
- "User can disconnect with confirmation" ✓ User-observable
- "Disconnect warns about consequences" ✓ User-observable
- "User can reconnect from settings" ✓ User-observable
- "Connection status shows error state" ✓ User-observable

**Artifacts map to truths:** ✓
**Key_links specify method:** ✓ (props, fetch, imports)

**No derivation issues detected.** All truths are user-observable, artifacts support truths, key_links connect components.

---

## Context Compliance (CONTEXT.md)

### Locked Decisions Verification

**Authorization Flow UX:**
- ✓ Timing: During onboarding (after availability) — Plan 03-T2 updates availability page routing
- ✓ Optional with skip — Skip buttons in Plan 03-T2 both steps
- ✓ Skip consequence: Settings-based reconnect — Plan 04-T2 settings page
- ✓ OAuth redirect: Continue to next step — Callback redirects to calendar-connect?step=select
- ✓ OAuth denial/cancel = skip — Plan 02-T2 handles error='access_denied'
- ✓ Permission transparency — Plan 03-T2 shows permissions card before OAuth

**Calendar Selection:**
- ✓ UI component: Dropdown list — Plan 03-T2 uses shadcn Select
- ✓ Only writable calendars — Plan 03-T1 uses minAccessRole='writer'
- ✓ Change calendar later: Yes — Plan 04-T2 "Change Calendar" section
- ✓ Default: "Iron Life Man" calendar — Plan 03-T2 create button + auto-select

**Connection Status Visibility:**
- ✓ Dashboard header/nav — Plan 04-T2 DashboardHeader integration
- ✓ Settings page — Plan 04-T2 settings/calendar page
- ✓ Workout calendar view — (Deferred to Phase 2, outside this phase scope)
- ✓ Disconnect with confirmation AND consequences — Plan 04-T2 Dialog with warning text
- ✓ Error states change indicator — Plan 04-T1 ConnectionStatus variants (red/amber)

**All locked decisions implemented correctly.** No contradictions detected.

### Deferred Ideas Check

**None listed in CONTEXT.md.** No scope creep detected.

---

## Issues Found

**None.**

---

## Recommendations

1. **Proceed to execution** — All plans verified, no blockers
2. **User setup required** (Plan 01-01):
   - Google Cloud Console: Create OAuth Client ID, enable Calendar API
   - Supabase Dashboard: Enable Vault extension
   - Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
3. **Execute in wave order:**
   - Wave 1: Plan 01-01 (migrations + types)
   - Wave 2: Plan 01-02 (OAuth flow)
   - Wave 3: Plans 01-03 + 01-04 (parallel)

---

## Verification Checklist

- [x] Phase goal extracted from ROADMAP.md
- [x] All PLAN.md files loaded (4 plans)
- [x] must_haves parsed from each plan frontmatter
- [x] Requirement coverage checked (all 5 requirements covered)
- [x] Task completeness validated (all tasks have files/action/verify/done)
- [x] Dependency graph verified (no cycles, valid references, consistent waves)
- [x] Key links checked (wiring planned and explicit)
- [x] Scope assessed (within context budget)
- [x] must_haves derivation verified (user-observable truths)
- [x] Context compliance checked (all locked decisions honored)
- [x] Overall status determined: PASSED

---

**Verification completed:** 2026-02-12  
**Verifier:** gsd-plan-checker (goal-backward analysis)  
**Verdict:** PASSED — Plans will achieve phase goal  
**Next step:** Execute Phase 1 with `/gsd:execute-phase 1`
