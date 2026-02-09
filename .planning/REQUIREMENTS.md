# Requirements: Iron Life Man

**Defined:** 2026-02-09
**Core Value:** Making Ironman training feasible by automatically fitting training into real life instead of forcing manual weekly juggling

## v1 Requirements

Requirements for calendar integration and drag-drop workout rescheduling.

### Google Calendar Integration

- [ ] **GCAL-01**: User can authorize Iron Life Man to access their Google Calendar via OAuth
- [ ] **GCAL-02**: User can select which calendar to write workouts to during setup
- [ ] **GCAL-03**: System writes generated workouts to user's Google Calendar automatically
- [ ] **GCAL-04**: System reads user's work calendar(s) to identify existing events
- [ ] **GCAL-05**: System detects conflicts between workouts and work meetings
- [ ] **GCAL-06**: User can see visual indicators when workout overlaps with work event
- [ ] **GCAL-07**: System syncs workout changes from app back to Google Calendar
- [ ] **GCAL-08**: System syncs changes from Google Calendar back to app (two-way sync)
- [ ] **GCAL-09**: User can connect multiple calendars to read for conflicts (work + personal)
- [ ] **GCAL-10**: System handles OAuth token refresh automatically without user intervention
- [ ] **GCAL-11**: User can see sync status (last synced time, any errors)
- [ ] **GCAL-12**: System handles timezone conversions correctly across app and calendar

### Drag-Drop Workout Rescheduling

- [ ] **DRAG-01**: User can drag workout to a different day in weekly calendar view
- [ ] **DRAG-02**: User can drag workout to a different time within the same day
- [ ] **DRAG-03**: User sees visual feedback while dragging (preview of where workout will land)
- [ ] **DRAG-04**: User can undo a workout move immediately after dropping
- [ ] **DRAG-05**: User can swap two workouts by dragging one onto another
- [ ] **DRAG-06**: System prevents dragging workouts to past dates
- [ ] **DRAG-07**: User can move workouts using keyboard navigation (accessibility)
- [ ] **DRAG-08**: Dragged workouts snap to time slot boundaries (not free-form positioning)
- [ ] **DRAG-09**: Touch-friendly drag targets work on mobile devices
- [ ] **DRAG-10**: System syncs dragged workout changes to Google Calendar automatically

### Data Integrity

- [ ] **DATA-01**: System stores workout times with IANA timezone names (not just UTC offsets)
- [ ] **DATA-02**: System uses field-level merge for sync conflicts (not last-write-wins)
- [ ] **DATA-03**: System encrypts OAuth tokens using Supabase Vault
- [ ] **DATA-04**: System validates workout ownership before allowing moves (user can only move their workouts)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Calendar Integration Advanced

- **GCAL-20**: User can configure privacy controls (which workout details sync to calendar)
- **GCAL-21**: System learns user's meeting patterns and suggests workout times around them
- **GCAL-22**: System factors commute time when scheduling workouts
- **GCAL-23**: System provides AI suggestions when dragging workout onto conflict

### Training Load Intelligence

- **LOAD-01**: System recalculates weekly training load when workouts are moved
- **LOAD-02**: System prevents moves that cause overtraining (>120% target volume)
- **LOAD-03**: System warns when moves create discipline imbalance (swim/bike/run distribution)
- **LOAD-04**: System suggests alternative times based on training load optimization

### Recurring Workouts

- **RECUR-01**: User can create recurring workouts (every Monday, every other week, etc.)
- **RECUR-02**: User can edit single instance of recurring workout without breaking recurrence
- **RECUR-03**: System handles recurring workout exceptions correctly with RRULE format
- **RECUR-04**: System adjusts recurring workouts correctly during DST transitions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time calendar sync | Polling every 15 min + webhooks is sufficient; real-time adds complexity without clear value |
| Bidirectional editing in both places simultaneously | Causes sync conflicts; app is source of truth for workout details, calendar for scheduling |
| Unlimited calendar connections | 1 write + 2-3 read calendars covers 95% of users; more adds UI complexity |
| Drag workouts to delete | Explicit delete button is clearer; accidental deletion is frustrating |
| Free-form drag positioning | Snap-to-grid prevents training plan chaos; time slots provide structure |
| Automatic workout rescheduling | User should control their schedule; AI suggestions are acceptable, auto-changes are not |
| Calendar apps beyond Google | Google Calendar covers majority; Apple/Outlook deferred to v2+ |
| Integration with fitness devices | Defer to future versions; focus on scheduling first |
| Social features or coach sharing | Personal training tool only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GCAL-01 | TBD | Pending |
| GCAL-02 | TBD | Pending |
| GCAL-03 | TBD | Pending |
| GCAL-04 | TBD | Pending |
| GCAL-05 | TBD | Pending |
| GCAL-06 | TBD | Pending |
| GCAL-07 | TBD | Pending |
| GCAL-08 | TBD | Pending |
| GCAL-09 | TBD | Pending |
| GCAL-10 | TBD | Pending |
| GCAL-11 | TBD | Pending |
| GCAL-12 | TBD | Pending |
| DRAG-01 | TBD | Pending |
| DRAG-02 | TBD | Pending |
| DRAG-03 | TBD | Pending |
| DRAG-04 | TBD | Pending |
| DRAG-05 | TBD | Pending |
| DRAG-06 | TBD | Pending |
| DRAG-07 | TBD | Pending |
| DRAG-08 | TBD | Pending |
| DRAG-09 | TBD | Pending |
| DRAG-10 | TBD | Pending |
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0 (roadmap not yet created)
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
