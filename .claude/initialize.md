# Ironman Training App - Technical Specification

## Product Overview

A dynamic Ironman training application that generates personalized 16-week training plans and syncs them to Google Calendar. Designed for first-time Ironman athletes and self-coached athletes who need their training to integrate seamlessly with their life schedule.

### Core Value Proposition
"See your training plan in your actual calendar so you can plan your life around it."

### MVP Scope
- Generate 3-week rolling training plan based on race date and fitness level
- One-way sync to Google Calendar
- Track workout completion and weekly volume by discipline
- Manual workout rescheduling (syncs back to calendar)
- Automated weekly plan generation (Sunday cron job)

### Explicitly Out of Scope (V2 Features)
- Smart calendar slot-finding based on availability
- Adaptive plan adjustments based on performance
- Wearable device integrations (Garmin, Strava, Whoop)
- Detailed workout prescriptions (power zones, pace targets)
- Recovery and nutrition tracking
- Auto-detection of Google Calendar changes

---

## Tech Stack

### Framework & Language
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**

### UI & Styling
- **Shadcn/ui** (component library)
- **Tailwind CSS**

### Backend & Database
- **Next.js API Routes** (serverless functions)
- **Supabase** (PostgreSQL database)

### Authentication
- **NextAuth.js v5**
  - Email/Password provider
  - Google OAuth provider

### External APIs
- **Google Calendar API** (one-way event sync)

### Deployment
- **Vercel** (hosting + cron jobs)

### Development Tools
- ESLint
- Prettier
- TypeScript strict mode

---

## Database Schema

### Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  race_date DATE NOT NULL,
  fitness_level VARCHAR(20) NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  target_hours_per_week INTEGER NOT NULL CHECK (target_hours_per_week >= 6 AND target_hours_per_week <= 20),
  weekday_time TIME NOT NULL, -- e.g., '06:00' or '18:00'
  weekend_time TIME NOT NULL, -- e.g., '08:00'
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  google_calendar_id VARCHAR(255), -- which calendar to sync to (default: 'primary')
  google_access_token TEXT, -- encrypted OAuth token
  google_refresh_token TEXT, -- encrypted OAuth refresh token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_race_date ON profiles(race_date);
```

#### workouts
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline VARCHAR(10) NOT NULL CHECK (discipline IN ('swim', 'bike', 'run')),
  workout_type VARCHAR(20) NOT NULL CHECK (workout_type IN ('easy', 'tempo', 'intervals', 'long')),
  duration_minutes INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  google_event_id VARCHAR(255), -- Google Calendar event ID
  week_number INTEGER NOT NULL, -- 1-16 (or more depending on training length)
  phase VARCHAR(10) NOT NULL CHECK (phase IN ('base', 'build', 'peak', 'taper')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, scheduled_date);
CREATE INDEX idx_workouts_user_week ON workouts(user_id, week_number);
CREATE INDEX idx_workouts_user_status ON workouts(user_id, status);
CREATE INDEX idx_workouts_google_event ON workouts(google_event_id) WHERE google_event_id IS NOT NULL;
```

### TypeScript Types
```typescript
// types/database.ts

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Discipline = 'swim' | 'bike' | 'run';
export type WorkoutType = 'easy' | 'tempo' | 'intervals' | 'long';
export type WorkoutStatus = 'scheduled' | 'completed' | 'skipped';
export type Phase = 'base' | 'build' | 'peak' | 'taper';

export interface Profile {
  id: string;
  race_date: Date;
  fitness_level: FitnessLevel;
  target_hours_per_week: number;
  weekday_time: string; // HH:MM format
  weekend_time: string; // HH:MM format
  timezone: string;
  google_calendar_id?: string;
  google_access_token?: string;
  google_refresh_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Workout {
  id: string;
  user_id: string;
  discipline: Discipline;
  workout_type: WorkoutType;
  duration_minutes: number;
  scheduled_date: Date;
  scheduled_time: string; // HH:MM format
  description: string;
  status: WorkoutStatus;
  completed_at?: Date;
  google_event_id?: string;
  week_number: number;
  phase: Phase;
  created_at: Date;
  updated_at: Date;
}
```

---

## Plan Generation Algorithm

### Constants
```typescript
// lib/plan-generation/constants.ts

export const DISCIPLINE_RATIOS = {
  swim: 0.18,  // 18% of total weekly volume
  bike: 0.52,  // 52% of total weekly volume
  run: 0.30,   // 30% of total weekly volume
} as const;

export const FITNESS_MULTIPLIERS = {
  beginner: 0.6,     // Start at 60% of target volume
  intermediate: 0.7, // Start at 70% of target volume
  advanced: 0.8,     // Start at 80% of target volume
} as const;

export const PHASE_DISTRIBUTION = {
  base: 0.40,   // First 40% of weeks
  build: 0.35,  // Next 35% of weeks
  peak: 0.20,   // Next 20% of weeks
  taper: 0.05,  // Final 5% of weeks
} as const;

export const MINIMUM_TRAINING_WEEKS = 12;

// Weekly workout distribution
export const WEEKLY_TEMPLATE = {
  swim: [
    { day: 'tuesday', type: 'easy' as const, volumePct: 0.4 },
    { day: 'thursday', type: 'intervals' as const, volumePct: 0.6 },
  ],
  bike: [
    { day: 'monday', type: 'easy' as const, volumePct: 0.25 },
    { day: 'wednesday', type: 'tempo' as const, volumePct: 0.30 },
    { day: 'saturday', type: 'long' as const, volumePct: 0.45 },
  ],
  run: [
    { day: 'tuesday', type: 'easy' as const, volumePct: 0.35 },
    { day: 'thursday', type: 'intervals' as const, volumePct: 0.30 },
    { day: 'sunday', type: 'long' as const, volumePct: 0.35 },
  ],
} as const;
```

### Phase Calculation
```typescript
// lib/plan-generation/phases.ts

export interface PhaseBreakdown {
  totalWeeks: number;
  baseWeeks: number;
  buildWeeks: number;
  peakWeeks: number;
  taperWeeks: number;
}

export function calculatePhases(raceDate: Date): PhaseBreakdown {
  const today = new Date();
  const totalWeeks = Math.floor(
    (raceDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  if (totalWeeks < MINIMUM_TRAINING_WEEKS) {
    throw new Error(
      `Need at least ${MINIMUM_TRAINING_WEEKS} weeks to train for an Ironman. You have ${totalWeeks} weeks.`
    );
  }

  return {
    totalWeeks,
    baseWeeks: Math.floor(totalWeeks * PHASE_DISTRIBUTION.base),
    buildWeeks: Math.floor(totalWeeks * PHASE_DISTRIBUTION.build),
    peakWeeks: Math.floor(totalWeeks * PHASE_DISTRIBUTION.peak),
    taperWeeks: Math.ceil(totalWeeks * PHASE_DISTRIBUTION.taper),
  };
}

export function getPhaseForWeek(weekNumber: number, phases: PhaseBreakdown): Phase {
  if (weekNumber <= phases.baseWeeks) return 'base';
  if (weekNumber <= phases.baseWeeks + phases.buildWeeks) return 'build';
  if (weekNumber <= phases.baseWeeks + phases.buildWeeks + phases.peakWeeks) return 'peak';
  return 'taper';
}

export function getCurrentWeekNumber(raceDate: Date): number {
  const today = new Date();
  const phases = calculatePhases(raceDate);
  const weeksSinceStart = Math.floor(
    (today.getTime() - (raceDate.getTime() - phases.totalWeeks * 7 * 24 * 60 * 60 * 1000)) / 
    (7 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, weeksSinceStart + 1);
}
```

### Volume Calculation
```typescript
// lib/plan-generation/volume.ts

export function calculateWeeklyVolume(
  weekNumber: number,
  phase: Phase,
  targetHours: number,
  fitnessLevel: FitnessLevel,
  phases: PhaseBreakdown
): number {
  const baseMultiplier = FITNESS_MULTIPLIERS[fitnessLevel];
  let phaseMultiplier: number;

  switch (phase) {
    case 'base': {
      // Ramp from 60% to 80% of target over base phase
      const progressPct = (weekNumber - 1) / phases.baseWeeks;
      phaseMultiplier = 0.6 + progressPct * 0.2;
      break;
    }
    case 'build': {
      // Ramp from 80% to 100% over build phase
      const weekInPhase = weekNumber - phases.baseWeeks;
      const progressPct = (weekInPhase - 1) / phases.buildWeeks;
      phaseMultiplier = 0.8 + progressPct * 0.2;
      break;
    }
    case 'peak': {
      // Hold at 100-110% over peak phase
      const weekInPhase = weekNumber - phases.baseWeeks - phases.buildWeeks;
      const progressPct = (weekInPhase - 1) / phases.peakWeeks;
      phaseMultiplier = 1.0 + Math.min(progressPct, 0.1);
      break;
    }
    case 'taper': {
      // Drop from 100% to 40% over taper
      const weekInPhase = weekNumber - phases.baseWeeks - phases.buildWeeks - phases.peakWeeks;
      const progressPct = (weekInPhase - 1) / phases.taperWeeks;
      phaseMultiplier = 1.0 - progressPct * 0.6;
      break;
    }
  }

  return targetHours * baseMultiplier * phaseMultiplier;
}
```

### Workout Generation
```typescript
// lib/plan-generation/workouts.ts

export interface WorkoutTemplate {
  discipline: Discipline;
  workout_type: WorkoutType;
  duration_minutes: number;
  day: string;
  description: string;
}

export function generateWeekWorkouts(
  userId: string,
  weekNumber: number,
  weekStartDate: Date,
  profile: Profile,
  phases: PhaseBreakdown
): Omit<Workout, 'id' | 'created_at' | 'updated_at'>[] {
  const phase = getPhaseForWeek(weekNumber, phases);
  const weeklyHours = calculateWeeklyVolume(
    weekNumber,
    phase,
    profile.target_hours_per_week,
    profile.fitness_level,
    phases
  );

  const swimHours = weeklyHours * DISCIPLINE_RATIOS.swim;
  const bikeHours = weeklyHours * DISCIPLINE_RATIOS.bike;
  const runHours = weeklyHours * DISCIPLINE_RATIOS.run;

  const workouts: Omit<Workout, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Generate swim workouts
  WEEKLY_TEMPLATE.swim.forEach((template) => {
    workouts.push({
      user_id: userId,
      discipline: 'swim',
      workout_type: template.type,
      duration_minutes: Math.round(swimHours * template.volumePct * 60),
      scheduled_date: getNextDayOfWeek(weekStartDate, template.day),
      scheduled_time: profile.weekday_time,
      description: getWorkoutDescription('swim', template.type),
      status: 'scheduled',
      week_number: weekNumber,
      phase,
    });
  });

  // Generate bike workouts
  WEEKLY_TEMPLATE.bike.forEach((template) => {
    const isWeekend = template.day === 'saturday' || template.day === 'sunday';
    workouts.push({
      user_id: userId,
      discipline: 'bike',
      workout_type: template.type,
      duration_minutes: Math.round(bikeHours * template.volumePct * 60),
      scheduled_date: getNextDayOfWeek(weekStartDate, template.day),
      scheduled_time: isWeekend ? profile.weekend_time : profile.weekday_time,
      description: getWorkoutDescription('bike', template.type),
      status: 'scheduled',
      week_number: weekNumber,
      phase,
    });
  });

  // Generate run workouts
  WEEKLY_TEMPLATE.run.forEach((template) => {
    const isWeekend = template.day === 'saturday' || template.day === 'sunday';
    workouts.push({
      user_id: userId,
      discipline: 'run',
      workout_type: template.type,
      duration_minutes: Math.round(runHours * template.volumePct * 60),
      scheduled_date: getNextDayOfWeek(weekStartDate, template.day),
      scheduled_time: isWeekend ? profile.weekend_time : profile.weekday_time,
      description: getWorkoutDescription('run', template.type),
      status: 'scheduled',
      week_number: weekNumber,
      phase,
    });
  });

  return workouts;
}

function getNextDayOfWeek(startDate: Date, dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  const currentDay = startDate.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  
  const result = new Date(startDate);
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

function getWorkoutDescription(discipline: Discipline, type: WorkoutType): string {
  const descriptions = {
    swim: {
      easy: 'Easy swim - Focus on technique and efficiency. Keep effort conversational.',
      tempo: 'Tempo swim - Sustained moderate effort. Build endurance at race pace.',
      intervals: 'Swim intervals - Build speed and power. Alternate hard efforts with recovery.',
      long: 'Long swim - Build aerobic endurance. Steady, sustainable pace.',
    },
    bike: {
      easy: 'Easy spin - Recovery pace. Keep cadence high, resistance low.',
      tempo: 'Tempo ride - Sustained moderate effort. Build strength and endurance.',
      intervals: 'Bike intervals - Build power and speed. Alternate hard efforts with recovery.',
      long: 'Long ride - Build aerobic endurance. Steady pace you can sustain for hours.',
    },
    run: {
      easy: 'Easy run - Conversational pace. Focus on form and aerobic development.',
      tempo: 'Tempo run - Comfortably hard pace. Build lactate threshold.',
      intervals: 'Run intervals - Build speed and VO2max. Alternate hard efforts with recovery.',
      long: 'Long run - Build endurance. Steady pace, practice race nutrition.',
    },
  };

  return descriptions[discipline][type];
}
```

---

## Google Calendar Integration

### OAuth Setup
```typescript
// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { SupabaseAdapter } from "@auth/supabase-adapter"

export const authOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user ID to session
      session.user.id = user.id;
      return session;
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### Calendar Event Creation
```typescript
// lib/google-calendar/events.ts

import { google } from 'googleapis';
import type { Workout } from '@/types/database';

export async function createCalendarEvent(
  workout: Workout,
  accessToken: string,
  calendarId: string = 'primary',
  timezone: string = 'America/New_York'
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const startDateTime = combineDateAndTime(
    workout.scheduled_date,
    workout.scheduled_time,
    timezone
  );
  
  const endDateTime = new Date(
    startDateTime.getTime() + workout.duration_minutes * 60 * 1000
  );

  const event = {
    summary: formatEventTitle(workout),
    description: workout.description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: timezone,
    },
    colorId: getColorId(workout.discipline),
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }],
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id!;
}

export async function updateCalendarEvent(
  workout: Workout,
  accessToken: string,
  calendarId: string = 'primary',
  timezone: string = 'America/New_York'
): Promise<void> {
  if (!workout.google_event_id) {
    throw new Error('Workout does not have a Google Calendar event ID');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const startDateTime = combineDateAndTime(
    workout.scheduled_date,
    workout.scheduled_time,
    timezone
  );
  
  const endDateTime = new Date(
    startDateTime.getTime() + workout.duration_minutes * 60 * 1000
  );

  await calendar.events.patch({
    calendarId,
    eventId: workout.google_event_id,
    requestBody: {
      summary: formatEventTitle(workout),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timezone,
      },
    },
  });
}

export async function markEventComplete(
  eventId: string,
  accessToken: string,
  calendarId: string = 'primary'
): Promise<void> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get current event
  const event = await calendar.events.get({
    calendarId,
    eventId,
  });

  // Update title to add checkmark
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: `✅ ${event.data.summary}`,
      colorId: '8', // Gray color for completed
    },
  });
}

function formatEventTitle(workout: Workout): string {
  const emoji = getEmoji(workout.discipline);
  const discipline = capitalize(workout.discipline);
  const type = capitalize(workout.workout_type);
  const duration = `${workout.duration_minutes}min`;
  
  return `${emoji} ${discipline} - ${type} ${duration}`;
}

function getEmoji(discipline: Discipline): string {
  const emojis = {
    swim: '🏊',
    bike: '🚴',
    run: '🏃',
  };
  return emojis[discipline];
}

function getColorId(discipline: Discipline): string {
  const colors = {
    swim: '7',  // Cyan
    bike: '10', // Green
    run: '11',  // Red
  };
  return colors[discipline];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function combineDateAndTime(
  date: Date,
  time: string,
  timezone: string
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  
  // Note: This is a simplified version. In production, use a library like date-fns-tz
  // to properly handle timezone conversions
  return combined;
}
```

---

## User Flows

### 1. Onboarding Flow

**Route:** `/onboarding`

**Steps:**

1. **Welcome Screen** (`/onboarding/welcome`)
   - Display app name, tagline, hero image
   - CTA: "Get Started" → navigate to step 2

2. **Race Information** (`/onboarding/race-info`)
   - Input: Race date (date picker, minimum 12 weeks out)
   - Input: Fitness level (radio buttons with descriptions)
     - Beginner: "New to endurance training or first Ironman"
     - Intermediate: "Completed marathons or half-Ironman"
     - Advanced: "Multiple Ironman finishes, consistent training background"
   - Validation: Race date must be at least 12 weeks away
   - CTA: "Continue" → navigate to step 3

3. **Training Availability** (`/onboarding/availability`)
   - Input: Target training hours per week (slider, 6-20 hours)
   - Input: Weekday training time (radio or custom time picker)
     - Morning (6:00 AM)
     - Evening (6:00 PM)
     - Custom
   - Input: Weekend training time
     - Morning (8:00 AM)
     - Afternoon (2:00 PM)
     - Custom
   - Input: Timezone (auto-detected, allow manual override)
   - CTA: "Continue" → navigate to step 4

4. **Google Calendar Connection** (`/onboarding/calendar`)
   - Explanation of calendar integration benefits
   - CTA: "Connect Google Calendar" → trigger OAuth flow
   - Secondary action: "Skip for now" → navigate to step 5
   - On OAuth success → navigate to step 5

5. **Plan Generation** (`/onboarding/generating`)
   - Loading state while generating initial 3 weeks
   - Progress indicator
   - Background tasks:
     - Create profile in database
     - Generate weeks 1-3 workouts
     - Sync to Google Calendar (if connected)
   - Auto-redirect to dashboard when complete

**Data Flow:**
```typescript
// Store onboarding data in React state or URL params
interface OnboardingData {
  raceDate: Date;
  fitnessLevel: FitnessLevel;
  targetHours: number;
  weekdayTime: string;
  weekendTime: string;
  timezone: string;
  calendarConnected: boolean;
}

// On final step, submit to API
POST /api/onboarding
{
  ...onboardingData
}

Response:
{
  profileId: string;
  workoutsGenerated: number;
  calendarSynced: boolean;
}
```

### 2. Dashboard View

**Route:** `/dashboard`

**Layout:**
```
Header
├── App logo
├── Current week indicator (e.g., "Week 3 of 16")
├── Phase badge (e.g., "Base Phase")
└── User menu (settings, sign out)

Volume Tracking Cards (Grid: 3 columns)
├── Swim Card
│   ├── Completed / Target hours
│   ├── Progress bar
│   └── Percentage complete
├── Bike Card
└── Run Card

Weekly Calendar View
├── Week navigation (prev/next week)
├── 7-day grid (Mon-Sun)
└── Workout cards in each day
    ├── Discipline emoji
    ├── Duration
    ├── Type
    └── Completion checkbox

Upcoming Workouts List
└── Next 5 upcoming workouts
    ├── Date and time
    ├── Discipline, type, duration
    └── Quick complete button
```

**Components:**
```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  // Fetch current week's workouts
  // Fetch user profile
  // Calculate volume stats
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <DashboardHeader />
      <VolumeTracking />
      <WeeklyCalendar />
      <UpcomingWorkouts />
    </div>
  );
}

// components/dashboard/VolumeTracking.tsx
export function VolumeTracking({ workouts }: { workouts: Workout[] }) {
  const stats = calculateVolumeStats(workouts);
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <VolumeCard discipline="swim" {...stats.swim} />
      <VolumeCard discipline="bike" {...stats.bike} />
      <VolumeCard discipline="run" {...stats.run} />
    </div>
  );
}

// Volume calculation
interface VolumeStats {
  completed: number; // hours
  target: number; // hours
  percentage: number;
}

function calculateVolumeStats(workouts: Workout[]) {
  return {
    swim: calculateForDiscipline(workouts, 'swim'),
    bike: calculateForDiscipline(workouts, 'bike'),
    run: calculateForDiscipline(workouts, 'run'),
  };
}

function calculateForDiscipline(workouts: Workout[], discipline: Discipline): VolumeStats {
  const disciplineWorkouts = workouts.filter(w => w.discipline === discipline);
  
  const target = disciplineWorkouts.reduce(
    (sum, w) => sum + w.duration_minutes,
    0
  ) / 60;
  
  const completed = disciplineWorkouts
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + w.duration_minutes, 0) / 60;
  
  return {
    completed,
    target,
    percentage: target > 0 ? Math.round((completed / target) * 100) : 0,
  };
}
```

### 3. Workout Completion Flow

**User Action:** Click checkbox or "Mark Complete" button on workout

**Steps:**

1. User clicks completion control
2. Optimistic UI update (show as completed immediately)
3. API call to mark workout complete
4. Update Google Calendar event (add ✅ to title)
5. Recalculate volume stats
6. Show success toast

**API:**
```typescript
// app/api/workouts/[id]/complete/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workoutId = params.id;

  // Update workout status
  const { data: workout, error } = await supabase
    .from('workouts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', workoutId)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Update Google Calendar if synced
  if (workout.google_event_id) {
    const profile = await getProfile(session.user.id);
    if (profile.google_access_token) {
      await markEventComplete(
        workout.google_event_id,
        profile.google_access_token,
        profile.google_calendar_id
      );
    }
  }

  return Response.json({ workout });
}
```

### 4. Workout Rescheduling Flow

**User Action:** Click "Reschedule" on workout or drag workout to new day/time

**Steps:**

1. Open edit modal with date/time pickers
2. User selects new date and time
3. Click "Save"
4. Optimistic UI update
5. API call to update workout
6. Update Google Calendar event
7. Show success toast

**API:**
```typescript
// app/api/workouts/[id]/reschedule/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { scheduled_date, scheduled_time } = await request.json();
  const workoutId = params.id;

  // Update workout
  const { data: workout, error } = await supabase
    .from('workouts')
    .update({
      scheduled_date,
      scheduled_time,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workoutId)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Update Google Calendar
  if (workout.google_event_id) {
    const profile = await getProfile(session.user.id);
    if (profile.google_access_token) {
      await updateCalendarEvent(
        workout,
        profile.google_access_token,
        profile.google_calendar_id,
        profile.timezone
      );
    }
  }

  return Response.json({ workout });
}
```

---

## Cron Jobs

### Weekly Plan Generation

**Schedule:** Every Sunday at 00:00 UTC

**Configuration:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-plans",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

**Implementation:**
```typescript
// app/api/cron/generate-plans/route.ts

export const runtime = 'edge';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get all active profiles (race date in future)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .gte('race_date', new Date().toISOString());

  if (error) {
    console.error('Error fetching profiles:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  let successCount = 0;
  let errorCount = 0;

  // Generate next week for each profile
  for (const profile of profiles) {
    try {
      await generateNextWeekIfNeeded(profile);
      successCount++;
    } catch (err) {
      console.error(`Error generating plan for user ${profile.id}:`, err);
      errorCount++;
    }
  }

  return Response.json({
    success: true,
    processed: profiles.length,
    successCount,
    errorCount,
  });
}

async function generateNextWeekIfNeeded(profile: Profile) {
  const phases = calculatePhases(new Date(profile.race_date));
  const currentWeek = getCurrentWeekNumber(new Date(profile.race_date));
  const targetWeek = currentWeek + 3; // Generate week N+3

  // Check if target week already exists
  const { data: existingWorkouts } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', profile.id)
    .eq('week_number', targetWeek)
    .limit(1);

  if (existingWorkouts && existingWorkouts.length > 0) {
    // Week already generated
    return;
  }

  // Calculate week start date
  const today = new Date();
  const weeksFromToday = targetWeek - currentWeek;
  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() + weeksFromToday * 7);

  // Generate workouts for target week
  const workouts = generateWeekWorkouts(
    profile.id,
    targetWeek,
    weekStartDate,
    profile,
    phases
  );

  // Insert workouts
  const { data: insertedWorkouts, error } = await supabase
    .from('workouts')
    .insert(workouts)
    .select();

  if (error) {
    throw new Error(`Failed to insert workouts: ${error.message}`);
  }

  // Sync to Google Calendar if connected
  if (profile.google_access_token && insertedWorkouts) {
    for (const workout of insertedWorkouts) {
      try {
        const eventId = await createCalendarEvent(
          workout,
          profile.google_access_token,
          profile.google_calendar_id || 'primary',
          profile.timezone
        );

        // Update workout with event ID
        await supabase
          .from('workouts')
          .update({ google_event_id: eventId })
          .eq('id', workout.id);
      } catch (err) {
        console.error(`Failed to create calendar event for workout ${workout.id}:`, err);
        // Continue with other workouts even if one fails
      }
    }
  }
}
```

---

## API Routes

### Core Routes
```typescript
// Authentication (handled by NextAuth)
POST   /api/auth/signin
POST   /api/auth/signout
GET    /api/auth/session

// Onboarding
POST   /api/onboarding
  Body: {
    race_date: string;
    fitness_level: FitnessLevel;
    target_hours_per_week: number;
    weekday_time: string;
    weekend_time: string;
    timezone: string;
  }
  Response: {
    profile: Profile;
    workouts: Workout[];
    calendar_synced: boolean;
  }

// Workouts
GET    /api/workouts
  Query: {
    week?: number;
    start_date?: string;
    end_date?: string;
  }
  Response: {
    workouts: Workout[];
  }

GET    /api/workouts/[id]
  Response: {
    workout: Workout;
  }

POST   /api/workouts/[id]/complete
  Response: {
    workout: Workout;
  }

POST   /api/workouts/[id]/skip
  Response: {
    workout: Workout;
  }

PATCH  /api/workouts/[id]/reschedule
  Body: {
    scheduled_date: string;
    scheduled_time: string;
  }
  Response: {
    workout: Workout;
  }

// Profile
GET    /api/profile
  Response: {
    profile: Profile;
  }

PATCH  /api/profile
  Body: Partial<Profile>
  Response: {
    profile: Profile;
  }

// Calendar
POST   /api/calendar/connect
  Body: {
    calendar_id?: string;
  }
  Response: {
    success: boolean;
  }

POST   /api/calendar/disconnect
  Response: {
    success: boolean;
  }

POST   /api/calendar/sync
  Response: {
    synced: number;
    errors: number;
  }

// Cron (protected by secret)
GET    /api/cron/generate-plans
  Headers: {
    Authorization: "Bearer <CRON_SECRET>"
  }
  Response: {
    processed: number;
    successCount: number;
    errorCount: number;
  }
```

---

## Environment Variables
```bash
# .env.local

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxxx # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# Cron Secret
CRON_SECRET=xxxxx # Generate with: openssl rand -base64 32
```

---

## Development Timeline (8 Weeks)

### Week 1: Foundation & Setup
- [ ] Initialize Next.js 16 project with TypeScript
- [ ] Configure Tailwind CSS and shadcn/ui
- [ ] Setup Supabase project and create database schema
- [ ] Configure NextAuth.js with email provider
- [ ] Implement basic auth flows (signup, signin, signout)
- [ ] Create protected route middleware
- [ ] Setup basic layout and navigation

**Deliverable:** User can create an account and sign in

### Week 2: Onboarding Flow
- [ ] Create onboarding route structure
- [ ] Implement welcome screen
- [ ] Build race info form with validation
- [ ] Build training availability form
- [ ] Create onboarding state management
- [ ] Implement onboarding API endpoint
- [ ] Add loading states and error handling

**Deliverable:** Complete onboarding flow that saves profile to database

### Week 3: Plan Generation
- [ ] Implement phase calculation algorithm
- [ ] Implement volume calculation logic
- [ ] Create workout generation function
- [ ] Build onboarding completion flow (generate initial 3 weeks)
- [ ] Write unit tests for plan generation
- [ ] Create seed data for testing

**Deliverable:** Workouts are generated and stored in database after onboarding

### Week 4: Dashboard UI
- [ ] Create dashboard layout
- [ ] Build volume tracking cards with progress bars
- [ ] Implement weekly calendar component (custom grid)
- [ ] Create workout card component
- [ ] Build upcoming workouts list
- [ ] Add empty states and loading skeletons
- [ ] Implement week navigation

**Deliverable:** Can view generated workouts in dashboard

### Week 5: Completion & Rescheduling
- [ ] Build mark complete functionality
- [ ] Implement volume recalculation on completion
- [ ] Create workout edit modal
- [ ] Implement reschedule functionality
- [ ] Add optimistic UI updates
- [ ] Create toast notifications
- [ ] Handle edge cases (undo, errors)

**Deliverable:** Can mark workouts complete and reschedule them

### Week 6: Google Calendar Integration
- [ ] Add Google OAuth to NextAuth configuration
- [ ] Create calendar connection flow
- [ ] Implement calendar event creation
- [ ] Implement calendar event updates
- [ ] Add completion status sync (checkmark in title)
- [ ] Handle OAuth token refresh
- [ ] Add error handling and retry logic

**Deliverable:** Workouts sync to Google Calendar and update on changes

### Week 7: Rolling Plan & Cron
- [ ] Create cron API route
- [ ] Implement "generate next week" logic
- [ ] Test cron locally with manual triggers
- [ ] Configure Vercel cron job
- [ ] Add logging and error tracking
- [ ] Test end-to-end plan generation

**Deliverable:** New week auto-generates every Sunday

### Week 8: Polish & Deployment
- [ ] Mobile responsive testing and fixes
- [ ] Add error boundaries
- [ ] Implement settings page (edit profile, disconnect calendar)
- [ ] Create 404 and error pages
- [ ] Add loading states throughout app
- [ ] Accessibility audit (keyboard nav, ARIA labels)
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Deploy to Vercel production
- [ ] Setup monitoring and analytics

**Deliverable:** Production-ready MVP deployed and accessible

---

## Testing Strategy

### Unit Tests
- Plan generation algorithms (phases, volume, workouts)
- Date/time utility functions
- Volume calculation functions
- Workout description generation

### Integration Tests
- Onboarding flow end-to-end
- Workout completion with calendar sync
- Reschedule with calendar update
- Cron job execution

### Manual Testing Checklist
- [ ] Complete onboarding as beginner
- [ ] Complete onboarding as advanced
- [ ] View dashboard with workouts
- [ ] Mark workout complete
- [ ] Reschedule workout
- [ ] Connect Google Calendar
- [ ] Verify events in Google Calendar
- [ ] Edit event in calendar, verify no conflicts
- [ ] Disconnect Google Calendar
- [ ] Test on mobile devices
- [ ] Test with different timezones

---

## Edge Cases & Error Handling

### Onboarding
- Race date less than 12 weeks away → Show error, require new date
- User already has profile → Redirect to dashboard
- Google Calendar OAuth fails → Allow skip, continue to dashboard

### Plan Generation
- Invalid phase calculation → Log error, use fallback values
- Zero workouts generated → Log error, retry with default values
- Database insert fails → Rollback transaction, show error to user

### Google Calendar Sync
- OAuth token expired → Attempt refresh, prompt reconnection if fails
- API rate limit hit → Queue for retry, show warning to user
- Event creation fails → Continue with app, mark calendar sync as failed
- User deleted event in Google Calendar → Ignore (read-only in our app)

### Cron Jobs
- No profiles to process → Return success (nothing to do)
- Profile processing fails → Log error, continue with next profile
- Database connection fails → Retry 3 times, then alert admin

### Workout Operations
- Complete already completed workout → Allow (idempotent)
- Reschedule to invalid date → Validate and reject
- Delete workout → Not allowed in MVP (could be V2 feature)

---

## Security Considerations

### Authentication
- Use NextAuth.js secure session handling
- Store tokens encrypted in database
- Implement CSRF protection (NextAuth default)
- Use HTTP-only cookies for session

### API Routes
- Verify user authentication on all protected routes
- Validate user owns resource before allowing modifications
- Sanitize all user inputs
- Use Supabase RLS (Row Level Security) policies

### Google Calendar Access
- Request minimum required scopes (calendar.events only)
- Store access tokens encrypted
- Implement token refresh logic
- Handle revoked access gracefully

### Cron Jobs
- Protect cron endpoints with secret token
- Verify Authorization header matches CRON_SECRET
- Rate limit to prevent abuse
- Log all executions for audit trail

---

## Monitoring & Observability

### Logging
- Log all cron job executions
- Log Google Calendar API errors
- Log plan generation failures
- Use structured logging (JSON format)

### Metrics to Track
- User signups per day
- Workouts completed per user
- Calendar sync success rate
- Cron job execution time
- API response times

### Error Tracking
- Use Vercel Analytics (built-in)
- Consider Sentry for detailed error tracking
- Set up email alerts for critical errors

---

## Future Enhancements (V2)

### Adaptive Training
- Adjust plan based on completion rate
- Detect consistent under-completion and reduce volume
- Suggest makeup workouts
- Analyze performance trends

### Smart Scheduling
- Parse Google Calendar for free time slots
- Auto-suggest reschedules when conflicts detected
- Detect when user moves events in calendar, update plan

### Wearable Integration
- Connect Garmin, Strava, Whoop
- Import actual workout data (distance, pace, HR)
- Use real performance metrics to adapt plan
- Track recovery metrics (HRV, sleep quality)

### Enhanced Workouts
- Detailed workout prescriptions (pace zones, power targets)
- Brick workouts (bike-to-run transitions)
- Strength training sessions
- Swim technique drills library

### Social & Coaching
- Share workouts with coach
- Join training groups
- Compare progress with other athletes
- Virtual race simulation

### Analytics
- Training load charts
- Fitness progression graphs
- Race day predictions
- Injury risk indicators

---

## Success Metrics

### MVP Launch Goals
- 10 users complete onboarding
- 80%+ calendar sync success rate
- 70%+ weekly workout completion rate
- Zero critical bugs in first week
- Average session duration > 5 minutes

### 3-Month Goals
- 50 active users
- 500+ workouts completed
- 90%+ cron job success rate
- User retention > 60% (return after 1 week)
- Collect user feedback for V2 features

---

## Notes for Claude Code

### Code Style Preferences
- Use functional components with hooks
- Prefer named exports over default exports
- Use TypeScript strict mode
- Follow Airbnb style guide for JavaScript
- Use Prettier for formatting (2 spaces, single quotes)

### Component Structure
```
app/
├── (auth)/
│   ├── signin/
│   └── signup/
├── (dashboard)/
│   └── dashboard/
├── onboarding/
│   ├── welcome/
│   ├── race-info/
│   ├── availability/
│   └── calendar/
└── api/
    ├── auth/
    ├── workouts/
    ├── profile/
    ├── calendar/
    └── cron/

components/
├── ui/ (shadcn components)
├── dashboard/
├── onboarding/
└── workouts/

lib/
├── plan-generation/
├── google-calendar/
├── supabase/
└── utils/
```

### Commit Strategy
- Week 1: Foundation commits (setup, auth, database)
- Week 2: Onboarding feature commits
- Week 3: Plan generation commits
- Week 4: Dashboard UI commits
- Week 5: Workout operations commits
- Week 6: Calendar integration commits
- Week 7: Cron job commits
- Week 8: Polish and deployment commits

### Testing During Development
- Test each feature in isolation before moving on
- Use Supabase local development for database testing
- Mock Google Calendar API during development
- Create seed data for different user scenarios

---

## Questions & Clarifications

If any requirements are unclear during implementation:

1. **Timezone handling**: Use user's profile timezone for all date/time operations
2. **Workout descriptions**: Keep generic for MVP (as specified in algorithm)
3. **Calendar event colors**: Use discipline-specific colors (swim=cyan, bike=green, run=red)
4. **Completion behavior**: Binary complete (no partial completion in MVP)
5. **Missed weeks**: Continue generating forward, don't block or compress
6. **Multiple calendars**: Default to 'primary', allow user to select during connection

---

## End of Specification

This spec should provide everything needed to build the MVP. Focus on shipping a working product in 8 weeks, then iterate based on real user feedback.

Good luck! 🏊🚴🏃