# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- TypeScript 5.0.0 - Used for all application code, strict mode enabled
- JavaScript - Node.js scripts (migrations)
- SQL - PostgreSQL database migrations in `supabase/migrations/`

**Secondary:**
- JSX/TSX - React component files throughout `app/` and `components/`

## Runtime

**Environment:**
- Node.js - Runtime for Next.js and server-side execution (no specific version pinned)

**Package Manager:**
- npm - Package management
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.0.0 - Full-stack React framework with App Router
  - Server Components and Server Actions enabled in `next.config.js`
  - App Router structure in `app/` directory

**UI/Component:**
- React 19.0.0 - Core UI framework
- React DOM 19.0.0 - React rendering
- Radix UI 1.x - Headless UI components
  - `@radix-ui/react-dialog` - Modal/dialog components
  - `@radix-ui/react-label` - Form labels
  - `@radix-ui/react-popover` - Popover components
  - `@radix-ui/react-progress` - Progress bars
  - `@radix-ui/react-select` - Select dropdowns
  - `@radix-ui/react-slot` - Slot composition
  - `@radix-ui/react-toast` - Toast notifications
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- lucide-react 0.344.0 - Icon library

**Drag & Drop:**
- `@dnd-kit/core` 6.3.1 - Drag and drop toolkit
- `@dnd-kit/utilities` 3.2.2 - Utilities for dnd-kit

**Styling & Utilities:**
- class-variance-authority 0.7.0 - CSS variant composition
- clsx 2.1.0 - Class name utility
- tailwind-merge 2.2.0 - Merge Tailwind CSS classes
- tailwindcss-animate 1.0.7 - Animation utilities

**Date/Time:**
- date-fns 4.1.0 - Date manipulation library
- date-fns-tz 2.0.0 - Timezone support for date-fns
- react-day-picker 9.13.0 - Date picker component

**Validation:**
- zod 3.22.0 - Schema validation and TypeScript type inference

**Testing:**
- Not detected in current dependencies

**Build/Dev:**
- TypeScript 5.0.0 - Type checking and compilation
- ESLint 8.0.0 - Linting
- eslint-config-next 16.0.0 - Next.js ESLint configuration
- Prettier 3.2.0 - Code formatting
- PostCSS 8.4.0 - CSS processing
- autoprefixer 10.4.0 - CSS vendor prefixes

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.39.0 - Supabase client library (primary backend)
- `@supabase/ssr` 0.8.0 - Supabase SSR utilities for authentication
- `googleapis` 128.0.0 - Google APIs client (for Google Calendar integration)

**Infrastructure:**
- `pg` 8.11.3 - PostgreSQL client (dev dependency, used by migration script)
- `dotenv` 16.4.5 - Environment variable loading

**Type Definitions:**
- `@types/node` 20.0.0 - Node.js type definitions
- `@types/react` 18.2.0 - React type definitions
- `@types/react-dom` 18.2.0 - React DOM type definitions
- `@types/pg` 8.11.0 - PostgreSQL client types

## Configuration

**Environment:**
- Configuration via `.env.local` (Next.js default) and `.env` files
- Environment example: `.env.example` documents required variables
- dotenv package loads environment variables (`.env.local` takes precedence)

**Key configs required:**
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-side)
- `GOOGLE_CLIENT_ID` - Google OAuth credentials
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `NEXTAUTH_URL` - Authentication URL
- `NEXTAUTH_SECRET` - Authentication session secret
- `CRON_SECRET` - Cron job authentication

**Build:**
- `tsconfig.json` - TypeScript configuration
  - Target: ES2017
  - Module: esnext
  - Strict mode enabled
  - Path alias: `@/*` → root directory
  - JSX: react-jsx
- `next.config.js` - Next.js configuration
  - Experimental feature: Server Actions enabled
- `.eslintrc.json` - ESLint configuration extending `next/core-web-vitals`
- `.prettierrc` - Prettier configuration
  - Semi-colons enabled
  - Single quotes
  - 2-space tabs
  - Trailing commas (ES5)
  - 100 character print width

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- Environment variables file (`.env.local`)
- Supabase project access
- PostgreSQL database (via Supabase)

**Production:**
- Deployment target: Vercel (Next.js optimized)
- Supabase PostgreSQL database
- Node.js runtime support

## Database

**Primary:**
- PostgreSQL - Via Supabase
- Client: `@supabase/supabase-js` (application) and `pg` (migrations)

**Schema:**
- Migrations located in `supabase/migrations/`
- Migration runner: `scripts/run-migrations.js` - Interactive CLI for running SQL migrations
- Database connection: PostgreSQL URI or Supabase direct connection
- Tables include: user_profiles, workouts, races, training_preferences, integrations, body_metrics, and more

---

*Stack analysis: 2026-02-09*
