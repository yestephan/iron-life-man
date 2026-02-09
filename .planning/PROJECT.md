# Iron Life Man

## What This Is

An AI-powered Ironman training scheduler that reads your work calendar, generates progressive training plans (swim/bike/run), and lets you drag-and-drop workouts when life happens. Designed to make Ironman training actually feasible for people with demanding work schedules.

## Core Value

Making Ironman training feasible by automatically fitting training into real life instead of forcing manual weekly juggling. If the system can't adapt training to work conflicts, the whole value proposition fails.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User can sign up and authenticate with email/password — Phase 0 (existing)
- ✓ User can complete onboarding flow (race date, fitness level, available hours, workout times) — Phase 0 (existing)
- ✓ AI generates progressive training plan based on race date and fitness level — Phase 0 (existing)
- ✓ AI applies Ironman discipline ratios (18% swim, 52% bike, 30% run) — Phase 0 (existing)
- ✓ AI calculates training phases (base/build/peak/taper) from race date — Phase 0 (existing)
- ✓ User can view weekly training schedule on dashboard with calendar view — Phase 0 (existing)
- ✓ User can complete, skip, or reschedule individual workouts — Phase 0 (existing)
- ✓ User can track training volume progress by discipline — Phase 0 (existing)
- ✓ System stores user preferences (fitness level, target hours, workout times) — Phase 0 (existing)

### Active

<!-- Current scope. Building toward these. -->

- [ ] System reads user's Google Calendar to identify work meeting conflicts
- [ ] System writes generated workouts to user's Google Calendar
- [ ] User can drag-and-drop workouts to different days in weekly view
- [ ] User can drag-and-drop workouts to different times within a day
- [ ] System recalculates training load balance when workouts are moved
- [ ] System syncs workout changes back to Google Calendar automatically
- [ ] User sees visual indication when dragging workout over time slot with work conflict
- [ ] System suggests alternative times when workout conflicts with work meeting
- [ ] User can swap two workouts by dragging one onto another

### Out of Scope

- Real-time calendar sync (periodic sync is sufficient) — Adds complexity without clear value
- Multi-calendar support beyond work calendar — Focus on single work calendar first
- Automatic workout rescheduling without user input — User should control their schedule
- Mobile native apps — Web-first, mobile web is sufficient for v1
- Social features or coach sharing — Personal training tool only
- Integration with fitness tracking devices (Garmin, Strava) — Defer to future versions

## Context

**Domain:** Ironman triathlon training for working professionals who need to balance training with work commitments.

**Existing Codebase:** Foundation is built (auth, onboarding, AI plan generation, basic dashboard). Now adding calendar integration and drag-drop workout movement.

**User Profile:** Ironman athletes with demanding work schedules who struggle to manually adjust training plans when meetings and work conflicts arise.

**Training Structure:** Weekly programs with individual workouts containing exercise name, instructions, duration, and intensity. Workouts span swim, bike, and run disciplines.

**Google Calendar Integration:** Primary integration point. Work calendar reveals conflicts; training calendar displays workouts. Two-way sync keeps both in sync.

## Constraints

- **Tech Stack**: React, TypeScript, Tailwind CSS, shadcn/ui, Next.js 16 (App Router), Supabase — Already established, don't change
- **Timeline**: Building for next season — Have several months, prioritize getting it right over rushing
- **Calendar API**: Google Calendar API — Must handle OAuth, rate limits, sync conflicts
- **Training Load**: Weekly volume must remain balanced — Moving workouts can't break progressive overload principles
- **Performance**: Drag-and-drop must feel responsive — Target <100ms feedback on drag operations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router with Server Components | Modern Next.js architecture, better performance | ✓ Good — Clean separation of server/client |
| Supabase for auth and data | Managed auth, PostgreSQL with RLS, realtime capabilities | ✓ Good — Auth works well, RLS provides security |
| Phase-based training progression | Ironman-standard approach (base/build/peak/taper) | ✓ Good — Matches how athletes think about training |
| @dnd-kit for drag-and-drop | Modern, accessible, flexible drag-and-drop library | — Pending — Installed but not yet implemented |
| Google Calendar as primary integration | Most widely used work calendar | — Pending — Integration structure exists, sync logic needed |

---
*Last updated: 2026-02-09 after project initialization*
