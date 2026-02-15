---
status: testing
phase: 01-oauth-foundation
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: 2026-02-15T19:35:00Z
updated: 2026-02-15T19:35:00Z
---

## Current Test

number: 1
name: Complete OAuth flow from onboarding
expected: |
  Navigate to onboarding, reach calendar-connect step. Click "Connect Google Calendar" button, redirected to Google OAuth consent screen. Authorize the app with calendar permissions. Redirected back to app showing calendar selection page with dropdown of writable calendars. Can see option to "Create Iron Life Man Calendar". Select a calendar and click Continue, proceeds to plan generation.
awaiting: user response

## Tests

### 1. Complete OAuth flow from onboarding
expected: Navigate to onboarding, reach calendar-connect step. Click "Connect Google Calendar" button, redirected to Google OAuth consent screen. Authorize the app with calendar permissions. Redirected back to app showing calendar selection page with dropdown of writable calendars. Can see option to "Create Iron Life Man Calendar". Select a calendar and click Continue, proceeds to plan generation.
result: [pending]

### 2. Skip calendar connection during onboarding
expected: At calendar-connect step, click "Skip for Now" button. Application proceeds directly to plan generation without errors. No Google OAuth screen appears.
result: [pending]

### 3. Calendar selection shows only writable calendars
expected: After OAuth authorization, calendar dropdown only shows calendars where user has write access (not read-only calendars).
result: [pending]

### 4. Create Iron Life Man calendar
expected: Click "Create Iron Life Man Calendar" button, new calendar created in Google Calendar with name "Iron Life Man" and timezone matching user's profile. Calendar appears as selected option in dropdown.
result: [pending]

### 5. Dashboard header shows connection status
expected: After connecting calendar, dashboard header displays a green badge with checkmark icon indicating connected status. Badge is clickable and navigates to /settings/calendar.
result: [pending]

### 6. Settings page shows calendar connection
expected: Navigate to /settings, see Google Calendar section showing connection status. If connected, shows calendar name and status details. If disconnected, shows option to connect.
result: [pending]

### 7. Connect from settings after skip
expected: If calendar connection was skipped during onboarding, navigate to /settings/calendar and click "Connect Google Calendar". Redirected to Google OAuth, authorize, redirected back to settings showing connected status.
result: [pending]

### 8. Disconnect with confirmation dialog
expected: In /settings/calendar when connected, click "Disconnect" button. See confirmation dialog warning about consequences ("Workouts will stop syncing"). Confirm disconnect, connection status changes to disconnected and badge shows gray/disconnected state.
result: [pending]

### 9. Connection status shows error state
expected: If tokens become invalid (simulate by manually invalidating), dashboard badge shows red/amber alert icon indicating error state. Settings page shows error details.
result: [pending]

### 10. Token refresh happens automatically
expected: After access token expires (can check by setting expiry in past in database), making a calendar API call triggers automatic token refresh. New tokens are persisted to Vault. No user re-authentication required.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
