# Coding Conventions

**Analysis Date:** 2026-02-09

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `DashboardHeader.tsx`, `VolumeTracking.tsx`, `WorkoutCard.tsx`)
- UI components: lowercase (e.g., `button.tsx`, `card.tsx`, `dialog.tsx`, `badge.tsx`)
- Utilities: camelCase (e.g., `utils.ts`, `queries.ts`, `workouts.ts`, `phases.ts`)
- Hooks: `use-` prefix with kebab-case (e.g., `use-toast.ts`)
- Pages: lowercase or kebab-case (e.g., `page.tsx` in route directories)
- API routes: lowercase with brackets for dynamic segments (e.g., `[id]`, `route.ts`)

**Functions:**
- camelCase for all functions: `generateWeekWorkouts()`, `getProfile()`, `updateWorkout()`, `workoutRowToWorkout()`
- Helper/utility functions prefixed with descriptive verb: `getNextDayOfWeek()`, `combineToProfile()`, `getWorkoutDescription()`
- Async functions follow same camelCase pattern: `getWorkouts()`, `updateWorkout()`

**Variables:**
- camelCase for local variables and parameters: `weekNumber`, `swimHours`, `bikeHours`, `profileId`, `userId`
- CONSTANT_CASE for true constants: `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`, `DISCIPLINE_RATIOS`, `WEEKLY_TEMPLATE`, `MAX_SAFE_INTEGER`
- snake_case for database column references: `user_id`, `scheduled_date`, `completed_at`, `created_at`, `fitness_level`, `target_hours_per_week`

**Types:**
- PascalCase for interfaces: `ButtonProps`, `DashboardHeaderProps`, `WorkoutTemplate`, `PhaseBreakdown`, `ToasterToast`, `State`
- PascalCase for type aliases: `Toast`, `Discipline`, `WorkoutType`, `WorkoutStatus`, `Phase`, `FitnessLevel`
- Union types use `|`: `type Discipline = 'swim' | 'bike' | 'run'`
- Row types use `Row` suffix: `UserProfileRow`, `WorkoutRow`, `TrainingPreferenceRow`, `RaceRow`, `IntegrationRow`

## Code Style

**Formatting:**
- Tool: Prettier 3.2.0
- Semicolons: enabled (`semi: true`)
- Single quotes: enforced (`singleQuote: true`)
- Tab width: 2 spaces (`tabWidth: 2`)
- Trailing comma: ES5 style (`trailingComma: "es5"`)
- Print width: 100 characters (`printWidth: 100`)

**Example formatted code:**
```typescript
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'sm' | 'lg' | 'default';
}

export const MyButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return <button className={cn(className)} ref={ref} {...props} />;
  }
);
```

**Linting:**
- Tool: ESLint 8.0.0 with Next.js core-web-vitals config
- Config: `.eslintrc.json` extends `"next/core-web-vitals"`
- No custom rules detected beyond Next.js defaults

## Import Organization

**Order:**
1. React and external libraries (e.g., `import * as React from 'react'`)
2. Radix-ui and third-party components (e.g., `import * as DialogPrimitive from '@radix-ui/react-dialog'`)
3. Icons from lucide-react (e.g., `import { Settings, Calendar } from 'lucide-react'`)
4. Internal utilities (e.g., `import { cn } from '@/lib/utils'`)
5. Internal components (e.g., `import Button from '@/components/ui/button'`)
6. Type imports (e.g., `import type { Phase } from '@/types/database'`)

**Path Aliases:**
- `@/*` resolves to project root, allowing imports like:
  - `@/components/ui/button`
  - `@/lib/utils`
  - `@/lib/supabase/queries`
  - `@/types/database`
  - `@/hooks/use-toast`

**Import style:**
- Prefer named imports: `import { getProfile, getWorkouts } from '@/lib/supabase/queries'`
- Use namespace imports for Radix-ui primitives: `import * as DialogPrimitive from '@radix-ui/react-dialog'`
- Use type imports for TypeScript types: `import type { Phase } from '@/types/database'`
- Re-export patterns: `export { Button, buttonVariants }` and `export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`

## Error Handling

**Patterns:**
- API routes use try-catch with console.error logging:
  ```typescript
  try {
    const user = await requireAuth();
    const supabase = await getSupabaseClient();
    // ... operation
    return NextResponse.json({ workout: updatedWorkout });
  } catch (error: any) {
    console.error('Error completing workout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
  ```

- Queries return `null` on error or not found:
  ```typescript
  export async function getProfile(userId: string): Promise<Profile | null> {
    // ... fetch logic
    if (userProfileError || !userProfile) return null;
  }
  ```

- Authorization checks return HTTP 403/404:
  ```typescript
  if (!workout) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }
  if (workout.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  ```

- Server-side pages use `redirect()` from `next/navigation` for unauthenticated access:
  ```typescript
  const user = await requireAuth();
  const profile = await getProfile(user.id, supabase);
  if (!profile) {
    redirect('/onboarding');
  }
  ```

## Logging

**Framework:** `console` object (native)

**Patterns:**
- `console.error()` for error logging in catch blocks with descriptive prefix:
  ```typescript
  console.error('Error completing workout:', error);
  console.error('Onboarding error:', error);
  console.error('Error generating plan:', error);
  ```
- No structured logging or external logging service detected
- Logging occurs only in error scenarios within try-catch blocks

## Comments

**When to Comment:**
- Inline comments explain complex algorithm logic (e.g., "// Ramp from 60% to 80% of target over base phase")
- Comments precede function definitions that are helpers:
  ```typescript
  // Helper to combine data from new schema tables into Profile
  function combineToProfile(...)

  // Helper to convert DB row to Workout
  function workoutRowToWorkout(row: WorkoutRow): Workout
  ```
- Section dividers with `// [Purpose of section]` (e.g., "// Generate swim workouts")
- Date arithmetic explanations:
  ```typescript
  // Adjust to Monday if training doesn't start on Monday
  // Adjust to Sunday (week starts on Sunday)
  // Reset time to start of day
  ```

**JSDoc/TSDoc:**
- Not detected in codebase
- No formal documentation comments found
- Interfaces and types rely on TypeScript for clarity

## Function Design

**Size:**
- Generally 50-100 lines maximum for business logic functions
- Example: `generateWeekWorkouts()` is ~88 lines including inline calculations
- Helpers extracted for reusable logic: `getNextDayOfWeek()`, `workoutRowToWorkout()`

**Parameters:**
- Prefer object/interface parameters over multiple arguments:
  ```typescript
  // Good: structured params
  function generateWeekWorkouts(
    userId: string,
    weekNumber: number,
    weekStartDate: Date,
    profile: Profile,
    phases: PhaseBreakdown
  )
  ```
- Optional parameters use optional chaining or defaults:
  ```typescript
  export async function getProfile(
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<Profile | null>
  ```

**Return Values:**
- Explicit return types always specified:
  ```typescript
  function generateWeekWorkouts(...): Omit<Workout, 'id' | 'created_at' | 'updated_at'>[]
  function workoutRowToWorkout(row: WorkoutRow): Workout
  export async function getProfile(...): Promise<Profile | null>
  ```
- Use union types with null for optional results: `Profile | null`
- Use `Omit<>` to exclude database-generated fields from return types

## Module Design

**Exports:**
- Named exports for functions: `export function cn(...)`
- Named exports for types: `export interface ButtonProps`
- Re-export patterns from UI components:
  ```typescript
  export { Button, buttonVariants };
  export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
  ```
- Default export for React components:
  ```typescript
  export default function DashboardHeader({ ... }: DashboardHeaderProps)
  ```

**Barrel Files:**
- UI component re-exports collect related exports:
  - `components/ui/button.tsx` exports `Button` and `buttonVariants`
  - `components/ui/card.tsx` exports all card-related components
- No index.ts barrel files detected at directory level

**Organization:**
- Separate concerns by directory:
  - `lib/supabase/` - database and authentication utilities
  - `lib/plan-generation/` - business logic for workout planning
  - `components/ui/` - primitive UI components
  - `components/dashboard/` - composed dashboard features
  - `types/database.ts` - all type definitions in single file

---

*Convention analysis: 2026-02-09*
