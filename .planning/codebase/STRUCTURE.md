# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
iron-life-man/
├── app/                          # Next.js app directory (App Router)
│   ├── (auth)/                   # Auth layout group
│   │   ├── signin/page.tsx       # Sign in form
│   │   └── signup/page.tsx       # Sign up form
│   ├── api/                      # API routes
│   │   ├── onboarding/route.ts   # Create profile & initial workouts
│   │   └── workouts/[id]/
│   │       ├── complete/route.ts # Mark workout complete
│   │       ├── skip/route.ts     # Skip workout
│   │       └── reschedule/route.ts # Reschedule workout
│   ├── onboarding/               # Onboarding flow pages
│   │   ├── page.tsx              # Redirect to welcome
│   │   ├── welcome/page.tsx      # Welcome step
│   │   ├── race-info/page.tsx    # Race date selection
│   │   ├── availability/page.tsx # Training times & hours
│   │   ├── generating/page.tsx   # Loading state
│   │   └── layout.tsx            # Onboarding layout
│   ├── dashboard/page.tsx        # Main dashboard
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── providers.tsx             # React providers (currently empty)
│   └── globals.css               # Global Tailwind styles
│
├── components/                   # React components
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── DashboardHeader.tsx   # Week/phase display
│   │   ├── VolumeTracking.tsx    # Swim/Bike/Run progress cards
│   │   ├── WeeklyCalendar.tsx    # Calendar view of workouts
│   │   ├── UpcomingWorkouts.tsx  # Workout list
│   │   └── WorkoutCard.tsx       # Individual workout card
│   ├── workouts/                 # Workout-related components
│   │   ├── RescheduleModal.tsx   # Reschedule UI
│   │   └── WorkoutActions.tsx    # Complete/Skip/Reschedule buttons
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── calendar.tsx
│       ├── popover.tsx
│       ├── select.tsx
│       └── badge.tsx
│
├── lib/                          # Utility libraries
│   ├── supabase/                 # Database & auth
│   │   ├── auth.ts               # getUser(), requireAuth(), getSupabaseClient()
│   │   ├── server.ts             # Supabase server client factory
│   │   ├── client.ts             # Supabase browser client factory
│   │   └── queries.ts            # CRUD operations (getProfile, getWorkouts, etc.)
│   ├── plan-generation/          # Training plan algorithm
│   │   ├── constants.ts          # Ratios, multipliers, templates
│   │   ├── phases.ts             # Phase calculation (base, build, peak, taper)
│   │   ├── volume.ts             # Volume ramping logic
│   │   └── workouts.ts           # Workout template generation
│   └── utils.ts                  # cn() utility for Tailwind classes
│
├── hooks/                        # Custom React hooks
│   └── use-toast.ts              # Toast notification hook
│
├── types/                        # TypeScript type definitions
│   └── database.ts               # All database types (entities + rows)
│
├── supabase/                     # Database setup
│   ├── migrations/               # SQL migration files
│   └── README.md                 # Supabase setup instructions
│
├── scripts/                      # Utility scripts
│   └── run-migrations.js         # Migration runner
│
├── .planning/                    # GSD planning documents
│   └── codebase/                 # Codebase analysis (this directory)
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind CSS config
├── postcss.config.js             # PostCSS config
├── .eslintrc.json                # ESLint config
├── .prettierrc                   # Prettier config
└── .env.example                  # Environment variables template
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router - handles routing, layouts, server components
- Contains: Page components (TSX), layouts, API routes
- Key files: `page.tsx` files define routes; `layout.tsx` files define layouts
- Nested groups like `(auth)` don't affect URL structure but organize layout hierarchy

**(auth)/**
- Purpose: Grouped layout for authentication pages
- Contains: Sign in and sign up pages
- Uses: Shared layout for consistent styling across auth flows

**api/**
- Purpose: Backend API endpoints for async operations
- Contains: POST routes for onboarding, workout operations
- Pattern: `route.ts` files use Next.js server API format
- Executed server-side; respects Supabase RLS

**onboarding/**
- Purpose: Multi-step user onboarding flow
- Contains: Sequential pages (welcome → race-info → availability → generating)
- Pattern: Client components for forms; server-side validation in API route
- Key file: `layout.tsx` provides step navigation UI

**components/**
- Purpose: Reusable React components (both server and client)
- Organization: Grouped by feature domain (dashboard, workouts, ui)
- UI folder: shadcn/ui primitives (copied into repo, not imported from package)
- Pattern: Most dashboard components are client components for interactivity

**dashboard/**
- Purpose: Dashboard-specific compound components
- Contains: VolumeTracking (progress bars), WeeklyCalendar (layout grid), UpcomingWorkouts (list)
- Pattern: Accept workout data as props, compute display values (e.g., VolumeTracking calculates stats)

**workouts/**
- Purpose: Workout interaction components
- Contains: WorkoutActions (buttons), RescheduleModal (form)
- Pattern: Client components that call API routes on action

**lib/supabase/**
- Purpose: Database access layer
- auth.ts: Authentication utilities; exports getUser(), requireAuth(), getSupabaseClient()
- server.ts: Server-side Supabase client initialization with service role for admin operations
- client.ts: Browser client for client-side auth operations (sign in/sign up)
- queries.ts: CRUD operations wrapped with type conversions (Row ↔ Entity)

**lib/plan-generation/**
- Purpose: Training plan algorithm - pure business logic
- constants.ts: Discipline ratios (18% swim, 52% bike, 30% run), phase distribution (40% base, 35% build, 20% peak, 5% taper), fitness multipliers
- phases.ts: Calculates phase boundaries, current week number, training start date
- volume.ts: Weekly volume scaling logic based on phase and fitness level
- workouts.ts: Generates workout array from templates, scales durations, assigns dates/times

**types/database.ts**
- Purpose: Central type definitions for all database entities
- Pattern: Each entity has two types: Interface (in-memory with Dates) and Row (DB with strings)
- Examples: Profile + ProfileRow, Workout + WorkoutRow
- Reason: Database returns strings for dates; app code uses Date objects

**hooks/use-toast.ts**
- Purpose: Custom hook for toast notifications
- Source: shadcn/ui toast hook
- Usage: `const { toast } = useToast()` in client components

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Landing page (redirects authenticated users to dashboard)
- `app/layout.tsx`: Root layout with global providers
- `app/(auth)/signin/page.tsx`: Sign in form
- `app/(auth)/signup/page.tsx`: Sign up form
- `app/dashboard/page.tsx`: Protected dashboard (main app)
- `app/onboarding/welcome/page.tsx`: Onboarding start

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*` → root)
- `next.config.js`: Next.js framework config
- `tailwind.config.ts`: Tailwind CSS theme and plugins
- `.eslintrc.json`: ESLint rule configuration
- `.prettierrc`: Code formatting rules

**Core Logic:**
- `lib/supabase/queries.ts`: All database CRUD operations
- `lib/supabase/auth.ts`: Authentication utilities
- `lib/plan-generation/workouts.ts`: Workout generation algorithm
- `app/api/onboarding/route.ts`: Profile creation and first 3 weeks of workouts

**Styling:**
- `app/globals.css`: Global Tailwind CSS utilities
- `tailwind.config.ts`: Tailwind theme configuration
- `components/ui/*.tsx`: shadcn/ui component library (locally copied)

**Testing:**
- No test files currently in codebase
- Location for tests would be: `__tests__/`, `*.test.ts`, `*.spec.ts`

## Naming Conventions

**Files:**
- Page files: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Layout files: `layout.tsx` (Next.js convention)
- Component files: `PascalCase.tsx` (React convention)
- Utility files: `kebab-case.ts` (e.g., `use-toast.ts`, `plan-generation/`)
- Type files: `database.ts` (domain-based naming)

**Directories:**
- Feature domains: lowercase with hyphens (e.g., `plan-generation`, `dashboard`)
- Grouped routes: parentheses notation (e.g., `(auth)`)
- API paths: match REST patterns (e.g., `api/workouts/[id]/complete`)

**Functions:**
- Server functions: `getX()` pattern for queries (e.g., `getUser()`, `getWorkouts()`)
- Hooks: `useX()` pattern (React convention)
- Utilities: camelCase descriptive names (e.g., `combineToProfile()`, `workoutRowToWorkout()`)
- Calculations: `calculateX()` pattern (e.g., `calculatePhases()`, `calculateWeeklyVolume()`)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `DISCIPLINE_RATIOS`, `MINIMUM_TRAINING_WEEKS`)
- camelCase for everything else (types, functions, variables)

**Types:**
- Entity types: PascalCase without suffix (e.g., `Profile`, `Workout`)
- Database row types: PascalCase with `Row` suffix (e.g., `ProfileRow`, `WorkoutRow`)
- Enums: PascalCase union types (e.g., `type Phase = 'base' | 'build' | 'peak' | 'taper'`)

## Where to Add New Code

**New Feature (e.g., workout analytics):**
- Primary code: `lib/` for algorithms, `app/` for pages, `components/` for UI
- Example structure:
  ```
  lib/analytics/                    # Algorithm
    └── calculate-volume.ts
  app/analytics/page.tsx            # Page
  components/analytics/             # Components
    ├── VolumeChart.tsx
    └── MetricsCard.tsx
  ```

**New Component/Module:**
- Implementation: `components/` for React components, organized by domain
- UI primitives: `components/ui/` (shadcn/ui pattern)
- Feature-specific: `components/[feature]/` (e.g., `components/dashboard/`)

**Utilities:**
- Shared helpers: `lib/utils.ts` for standalone functions (e.g., `cn()` for Tailwind classes)
- Domain-specific utilities: Create folder in `lib/` (e.g., `lib/plan-generation/`)
- Database: `lib/supabase/queries.ts` (add new query function)

**API Endpoints:**
- New workout operation: `app/api/workouts/[id]/[operation]/route.ts`
- New domain: `app/api/[domain]/route.ts` or `app/api/[domain]/[operation]/route.ts`
- Pattern: Follow RESTful conventions with dynamic segments in brackets

**Testing:**
- Unit tests: `lib/plan-generation/__tests__/phases.test.ts` (co-located with code)
- Component tests: `components/__tests__/WorkoutCard.test.tsx`
- Integration tests: `__tests__/api/onboarding.test.ts`
- Setup: Jest/Vitest with React Testing Library (if added)

**Database Additions:**
- New entity type: Add to `types/database.ts` (interface + row variant)
- New queries: Add functions to `lib/supabase/queries.ts`
- Migrations: SQL files in `supabase/migrations/` (numbered sequentially)

## Special Directories

**node_modules/**
- Purpose: NPM dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (in .gitignore)

**.next/**
- Purpose: Next.js build output
- Generated: Yes (by `pnpm build` or dev server)
- Committed: No (in .gitignore)

**supabase/migrations/**
- Purpose: SQL migration files
- Generated: No (manually created)
- Committed: Yes (version control)
- Pattern: Numbered files (001_initial_schema.sql, 002_add_integrations.sql, etc.)

**.planning/**
- Purpose: GSD orchestrator planning and analysis documents
- Generated: Yes (by Claude agents)
- Committed: Yes (reference for future runs)

**.claude/commands/, .claude/agents/, .claude/get-shit-done/**
- Purpose: GSD framework configuration and hooks
- Generated: Yes (by GSD initialization)
- Committed: Yes (maintains GSD state)

**.env.local**
- Purpose: Local environment variables (Supabase credentials, secrets)
- Generated: No (copy from .env.example and fill manually)
- Committed: No (in .gitignore)
- Contains: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXTAUTH_SECRET

---

*Structure analysis: 2026-02-09*
