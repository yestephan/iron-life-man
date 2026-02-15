---
phase: 01-oauth-foundation
verified: 2026-02-15T19:30:00Z
status: gaps_found
score: 4/5 must-haves verified
re_verification: false
gaps:
  - truth: "System encrypts OAuth tokens using Supabase Vault with no tokens exposed to client"
    status: partial
    reason: "Vault UUIDs are exposed in Profile type and populated from getProfile query"
    artifacts:
      - path: "types/database.ts"
        issue: "Profile interface includes google_access_token and google_refresh_token fields (lines 199-200)"
      - path: "lib/supabase/queries.ts"
        issue: "combineToProfile function populates Profile with Vault UUIDs from integration.access_token/refresh_token (lines 35-36)"
      - path: "lib/supabase/queries.ts"
        issue: "getProfile does select('*') on integrations table, fetching all columns including token fields (line 128)"
    missing:
      - "Remove google_access_token and google_refresh_token from Profile interface"
      - "Update getProfile to select only safe fields from integrations (not *)"
      - "Remove token field population from combineToProfile function"
      - "Verify Profile is never serialized to client in Server Components"
human_verification:
  - test: "Complete OAuth flow from onboarding"
    expected: "User clicks 'Connect Google Calendar', authorizes on Google, returns to calendar selection, creates 'Iron Life Man' calendar, selects it, continues to plan generation"
    why_human: "Multi-step OAuth flow with external Google consent screen requires visual verification of each step"
  - test: "Skip calendar connection during onboarding"
    expected: "User clicks 'Skip for Now' at any step, proceeds directly to plan generation without errors"
    why_human: "User flow validation requires human judgment of skip behavior"
  - test: "Connect from settings after skip"
    expected: "Navigate to /settings/calendar, click 'Connect Google Calendar', complete OAuth, see connection status change to connected"
    why_human: "Settings-based reconnection flow requires visual verification"
  - test: "Disconnect with consequences warning"
    expected: "In /settings/calendar, click 'Disconnect', see dialog with consequences listed, confirm, see status change to disconnected"
    why_human: "Confirmation dialog UX and consequences display require human verification"
  - test: "Dashboard header shows connection status"
    expected: "Dashboard header displays green badge when connected, gray badge when disconnected, badge is clickable and navigates to /settings/calendar"
    why_human: "Visual appearance and clickability of status indicator in dashboard UI"
  - test: "Token refresh happens automatically"
    expected: "After access token expires (simulate by setting token_expires_at in past), making a calendar API call triggers auto-refresh and persists new tokens to Vault"
    why_human: "Token refresh behavior is time-dependent and requires setting up test conditions"
---

# Phase 01: OAuth Foundation Verification Report

**Phase Goal:** Users can securely connect their Google Calendar with proper timezone handling for training data

**Verified:** 2026-02-15T19:30:00Z

**Status:** gaps_found

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can authorize Iron Life Man to access their Google Calendar through OAuth flow | ✓ VERIFIED | OAuth routes exist at /api/auth/google/authorize and /api/auth/google/callback with complete implementation. CSRF state validation present. Onboarding page links to OAuth flow. |
| 2 | User can select which calendar to write workouts to during connection setup | ✓ VERIFIED | listWritableCalendars, createIronLifeManCalendar, selectCalendar Server Actions exist and are wired to calendar-connect page. Calendar selection saves to integrations.calendar_id. |
| 3 | System automatically refreshes OAuth tokens without requiring user re-authentication | ✓ VERIFIED | oauth-client.ts implements 'tokens' event listener (line 72) that calls updateGoogleTokens when googleapis library auto-refreshes. access_type='offline' ensures refresh token. |
| 4 | System stores all workout times with IANA timezone names (not just UTC offsets) | ✓ VERIFIED | Migration 006 adds timezone VARCHAR(50) column to workouts table with 'UTC' default. Types updated with timezone field. workoutRowToWorkout properly converts null to undefined. |
| 5 | System encrypts OAuth tokens using Supabase Vault with no tokens exposed to client | ⚠️ PARTIAL | Vault RPC functions exist and are used in tokens.ts Server Actions. getGoogleCalendarIntegration does NOT expose tokens. However, Profile type includes token fields and getProfile populates them with Vault UUIDs. |

**Score:** 4/5 truths verified (1 partial)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/005_vault_setup.sql` | ✓ VERIFIED | 166 lines. Contains 4 RPC functions (create, read, update, delete) with auth.uid() checks. Vault extension enabled. |
| `supabase/migrations/006_update_integrations_for_vault.sql` | ✓ VERIFIED | 65 lines. Adds workouts.timezone column with IANA default. Comments on integration token columns. |
| `types/database.ts` | ✓ VERIFIED | Updated with timezone field on Workout/WorkoutRow. SyncStatus type added. GoogleCalendarIntegration type added. |
| `app/api/auth/google/authorize/route.ts` | ✓ VERIFIED | 72 lines. GET handler redirects to Google OAuth with CSRF state cookie. |
| `app/api/auth/google/callback/route.ts` | ✓ VERIFIED | 102 lines. Exchanges code for tokens, validates state, stores encrypted tokens, handles errors. |
| `app/actions/calendar/tokens.ts` | ✓ VERIFIED | 303 lines. 4 Server Actions using Vault RPC (create, read, update, delete). No plaintext tokens stored. |
| `lib/google/oauth-client.ts` | ✓ VERIFIED | 87 lines. OAuth2Client factory with auto-refresh listener. access_type='offline' and prompt='consent' present. |
| `app/actions/calendar/calendars.ts` | ✓ VERIFIED | 119 lines (per SUMMARY). 3 Server Actions: listWritableCalendars (minAccessRole='writer'), createIronLifeManCalendar (uses user timezone), selectCalendar. |
| `lib/google/calendar-client.ts` | ✓ VERIFIED | 13 lines (per SUMMARY). getCalendarClient factory using authenticated OAuth2Client. |
| `app/onboarding/calendar-connect/page.tsx` | ✓ VERIFIED | 375 lines. Two-step flow (permissions -> selection). Permissions card before OAuth. Skip support. Calendar dropdown with Iron Life Man creation. |
| `components/calendar/ConnectionStatus.tsx` | ✓ VERIFIED | 134 lines. Client component with compact/detailed variants. Color-coded status (green/amber/red/gray). No token data in props. |
| `components/calendar/CalendarSettings.tsx` | ⚠️ ORPHANED | 197 lines. Connect/disconnect UI with confirmation dialog. Has "Coming soon" placeholder for Change Calendar feature (line 121). |
| `app/(app)/settings/page.tsx` | ✓ VERIFIED | Server Component. Shows ConnectionStatus and link to calendar settings. |
| `app/(app)/settings/calendar/page.tsx` | ✓ VERIFIED | Server Component. Fetches integration, passes to CalendarSettings. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| authorize route | oauth-client.ts | import createOAuth2ClientInstance, generateAuthorizationUrl | ✓ WIRED | Line 3: import statement present |
| callback route | tokens.ts | calls storeGoogleTokens | ✓ WIRED | Line 4 import, line 73 call |
| oauth-client.ts | tokens.ts | calls getGoogleTokens, updateGoogleTokens | ✓ WIRED | Line 2 import, lines 56 and 74 calls |
| tokens.ts | Vault RPC | vault_create_secret, vault_read_secret, vault_update_secret, vault_delete_secret | ✓ WIRED | 11 RPC calls across 4 functions |
| calendar-connect page | /api/auth/google/authorize | href link | ✓ WIRED | Line 276: href="/api/auth/google/authorize" |
| calendar-connect page | calendars.ts | calls listWritableCalendars, createIronLifeManCalendar, selectCalendar | ✓ WIRED | Lines 24-26 imports, lines 104, 131, 164 calls |
| calendars.ts | calendar-client.ts | calls getCalendarClient | ✓ WIRED | Line 3 import, lines 18 and 56 calls |
| availability page | calendar-connect page | router.push navigation | ✓ WIRED | Line 46: router.push to calendar-connect |
| dashboard page | ConnectionStatus | renders via DashboardHeader | ✓ WIRED | Line 3 import getGoogleCalendarIntegration, line 20 fetch, passes to DashboardHeader |
| DashboardHeader | ConnectionStatus | renders component with integration prop | ✓ WIRED | Line 3 import, lines 60-63 render |
| CalendarSettings | deleteGoogleTokens | disconnect button calls | ✓ WIRED | Line 15 import, line 42 call |

### Requirements Coverage

Requirements from .planning/REQUIREMENTS.md mapped to Phase 1:

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| GCAL-01: OAuth authorization | ✓ SATISFIED | All truths verified: authorize route, callback route, CSRF validation |
| GCAL-02: Calendar selection during setup | ✓ SATISFIED | Calendar selection UI in onboarding, Server Actions wired, calendar_id saved to integrations |
| GCAL-10: Automatic token refresh | ✓ SATISFIED | 'tokens' event listener in oauth-client.ts, updateGoogleTokens persists refreshed tokens |
| DATA-01: IANA timezone storage | ✓ SATISFIED | workouts.timezone column exists, types updated, default 'UTC' |
| DATA-03: Vault-encrypted tokens | ⚠️ BLOCKED | Vault RPC functions work, tokens encrypted in storage, but Profile type exposes Vault UUIDs to application layer |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| components/calendar/CalendarSettings.tsx | 121 | "Coming soon" placeholder text | ℹ️ Info | Change Calendar feature not implemented. User can select calendar during onboarding but cannot change it later from settings. Workaround: disconnect and reconnect to select different calendar. |
| types/database.ts | 199-200 | google_access_token, google_refresh_token fields in Profile interface | ⚠️ Warning | While not the actual tokens, Vault UUIDs should not be exposed in Profile type. These fields are populated by getProfile but not currently used. Violates principle of server-side-only token handling. |
| lib/supabase/queries.ts | 128 | select('*') on integrations table in getProfile | ⚠️ Warning | Fetches all columns including access_token and refresh_token (Vault UUIDs). Should use explicit select with safe fields only. |
| lib/supabase/queries.ts | 35-36 | combineToProfile populates google_access_token and google_refresh_token | ⚠️ Warning | Populates Profile object with Vault UUIDs from integration record. These should not be in Profile at all. |

### Human Verification Required

See human_verification section in frontmatter for 6 test cases requiring manual verification:
1. Complete OAuth flow from onboarding
2. Skip calendar connection during onboarding  
3. Connect from settings after skip
4. Disconnect with consequences warning
5. Dashboard header shows connection status
6. Token refresh happens automatically

### Gaps Summary

**One gap blocks full goal achievement:**

The Phase 1 goal requires "System encrypts OAuth tokens using Supabase Vault **with no tokens exposed to client**". While tokens are encrypted in Vault and the getGoogleCalendarIntegration query properly excludes token fields, the Profile type and getProfile function expose Vault UUIDs to the application layer.

**Why this matters:** While Vault UUIDs aren't the actual OAuth tokens, exposing them in Profile violates the security principle that all token-related data should remain server-side only. If Profile is ever serialized to client-side components (e.g., via props or API responses), these UUIDs would be exposed.

**Current mitigation:** Profile is currently only used in Server Components and not serialized to clients. The newer getGoogleCalendarIntegration function properly excludes token fields. However, this creates a landmine for future developers who might serialize Profile.

**Gap details:**
- Profile interface includes google_access_token and google_refresh_token fields
- getProfile does select('*') on integrations, fetching all columns
- combineToProfile populates Profile with integration.access_token and integration.refresh_token (the Vault UUIDs)

**Note from 01-01-SUMMARY:** "Do NOT remove the existing google_access_token, google_refresh_token, google_calendar_id fields from the Profile interface. Those are used by the legacy combined type and will be updated in a later plan when we refactor the profile queries."

This indicates the gap is known and deferred to a future refactoring.

---

_Verified: 2026-02-15T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
