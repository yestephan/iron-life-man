# Phase 1: OAuth Foundation - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure Google Calendar authentication with OAuth flow. Users authorize access to their Google Calendar, select which calendar to write workouts to, and system manages OAuth tokens with automatic refresh. Timezone-aware data storage ensures workouts sync correctly across timezones.

Scope: OAuth authorization, token management, calendar selection, connection status. Calendar sync operations (reading/writing events) are in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Authorization Flow UX
- **Timing:** During onboarding (after availability step, before plan generation)
- **Required vs optional:** Optional with skip - user can skip during onboarding but it's encouraged
- **Skip consequence:** If skipped, calendar connection available in settings only (no repeated prompts)
- **OAuth redirect:** After user approves on Google, continue to next logical step in onboarding flow
- **OAuth denial/cancel:** Treat same as skip - continue without calendar, available in settings later
- **Permission transparency:** Show permissions first - explain we need read/write calendar access before sending to Google

### Calendar Selection
- **UI component:** Dropdown list to select calendar
- **Calendars to show:** Only writable calendars (filter out read-only automatically)
- **Change calendar later:** Yes, but warn about existing events when switching calendars
- **Default selection:** Create dedicated "Iron Life Man" calendar and pre-select it (offer to create during setup)

### Connection Status Visibility
- **Status indicator locations:** All of the above - dashboard header/nav, settings page, and workout calendar view
- **Disconnect option:** Yes, with both confirmation and consequences (explain workouts will stop syncing before confirming)
- **Error states:** Status indicator changes (icon turns red/warning color with error text)

### Claude's Discretion
- **Onboarding placement:** Claude picks natural spot in onboarding flow (after availability, before or after plan generation)
- **Button wording:** Claude picks appropriate authorization button text
- **Status indicator style:** Claude picks appropriate visual indicator for connection status
- **Token refresh timing:** Claude picks refresh strategy (proactive, on-expiration, or lazy)
- **Refresh failure handling:** Claude handles token refresh failures appropriately
- **User awareness of refresh:** Claude decides notification level for token refresh operations
- **Retry logic:** Claude picks retry strategy for failed token refreshes

</decisions>

<specifics>
## Specific Ideas

- Create dedicated "Iron Life Man" calendar as the default target calendar (makes it clear where workouts go, avoids cluttering main calendar)
- Show permissions clearly before OAuth flow (transparency builds trust)
- Multiple status indicator placements ensure users always know connection state
- Treat OAuth denial same as skip (don't be pushy, respect their choice)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Calendar sync operations (writing workouts, reading conflicts) are in Phases 2 and 3 as planned.

</deferred>

---

*Phase: 01-oauth-foundation*
*Context gathered: 2026-02-09*
