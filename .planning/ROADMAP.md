# Roadmap: Iron Life Man

## Overview

This roadmap transforms Iron Life Man from a static training planner into an adaptive calendar-integrated system. The journey progresses from OAuth authentication through write-only calendar sync, conflict detection, drag-drop rescheduling, and finally integrated sync—delivering the core value of making Ironman training fit into real work schedules automatically.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: OAuth Foundation** - Secure Google Calendar authentication and timezone-aware data model
- [ ] **Phase 2: Calendar Write Sync** - Generate workouts to user's Google Calendar automatically
- [ ] **Phase 3: Conflict Detection** - Read work calendars and identify scheduling conflicts
- [ ] **Phase 4: Drag-Drop Rescheduling** - Interactive workout movement with visual feedback
- [ ] **Phase 5: Integrated Sync** - Automatic calendar sync for dragged workouts

## Phase Details

### Phase 1: OAuth Foundation
**Goal**: Users can securely connect their Google Calendar with proper timezone handling for training data
**Depends on**: Nothing (first phase)
**Requirements**: GCAL-01, GCAL-02, GCAL-10, DATA-01, DATA-03
**Success Criteria** (what must be TRUE):
  1. User can authorize Iron Life Man to access their Google Calendar through OAuth flow
  2. User can select which calendar to write workouts to during connection setup
  3. System automatically refreshes OAuth tokens without requiring user re-authentication
  4. System stores all workout times with IANA timezone names (not just UTC offsets)
  5. System encrypts OAuth tokens using Supabase Vault with no tokens exposed to client
**Plans**: TBD

Plans:
- TBD during planning

### Phase 2: Calendar Write Sync
**Goal**: Users see their training workouts automatically appear in their Google Calendar
**Depends on**: Phase 1
**Requirements**: GCAL-03, GCAL-07, GCAL-11
**Success Criteria** (what must be TRUE):
  1. User's generated training plan workouts automatically appear in their selected Google Calendar
  2. User can see last sync status with timestamp and any error messages
  3. When user reschedules or completes workout in app, changes sync back to Google Calendar
  4. System handles sync failures gracefully with user notification and retry mechanism
**Plans**: TBD

Plans:
- TBD during planning

### Phase 3: Conflict Detection
**Goal**: Users can see when training workouts conflict with work meetings across multiple calendars
**Depends on**: Phase 2
**Requirements**: GCAL-04, GCAL-05, GCAL-06, GCAL-08, GCAL-09, GCAL-12, DATA-02
**Success Criteria** (what must be TRUE):
  1. User can connect multiple calendars to monitor for conflicts (work calendar, personal calendar)
  2. User sees visual indicators (color coding, icons) when workout overlaps with work meeting
  3. System detects scheduling conflicts between workouts and existing calendar events
  4. System syncs changes from Google Calendar back to app (two-way sync operational)
  5. System handles timezone conversions correctly when displaying workouts and conflicts
  6. System resolves sync conflicts using field-level merge (not last-write-wins)
**Plans**: TBD

Plans:
- TBD during planning

### Phase 4: Drag-Drop Rescheduling
**Goal**: Users can intuitively reschedule workouts by dragging them to different days and times
**Depends on**: Phase 3
**Requirements**: DRAG-01, DRAG-02, DRAG-03, DRAG-04, DRAG-05, DRAG-06, DRAG-07, DRAG-08, DRAG-09, DATA-04
**Success Criteria** (what must be TRUE):
  1. User can drag workout to different day in weekly calendar view with visual preview
  2. User can drag workout to different time within same day with time slot snapping
  3. User can undo workout move immediately after dropping with undo button or keyboard shortcut
  4. User can swap two workouts by dragging one onto another
  5. User can move workouts using keyboard navigation (Tab, Arrow keys, Enter) for accessibility
  6. User cannot drag workouts to past dates (system prevents invalid drops)
  7. Dragged workouts snap to 30-minute time slot boundaries automatically
  8. Drag interface works on mobile devices with touch-friendly targets
  9. System validates workout ownership before allowing moves (user can only move their own workouts)
**Plans**: TBD

Plans:
- TBD during planning

### Phase 5: Integrated Sync
**Goal**: Workout rescheduling in app automatically syncs to Google Calendar without manual refresh
**Depends on**: Phase 4
**Requirements**: DRAG-10
**Success Criteria** (what must be TRUE):
  1. When user drags workout to new day or time, change syncs to Google Calendar automatically
  2. User sees sync status indicator during drag-drop operations (syncing, synced, error)
  3. System handles sync queue correctly with retry logic for failed sync operations
**Plans**: TBD

Plans:
- TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. OAuth Foundation | 0/TBD | Not started | - |
| 2. Calendar Write Sync | 0/TBD | Not started | - |
| 3. Conflict Detection | 0/TBD | Not started | - |
| 4. Drag-Drop Rescheduling | 0/TBD | Not started | - |
| 5. Integrated Sync | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-09*
*Last updated: 2026-02-09*
