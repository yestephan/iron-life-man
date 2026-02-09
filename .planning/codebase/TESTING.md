# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Runner:**
- Not detected - No Jest, Vitest, or other test runner configured
- `package.json` has no test script or testing dependencies

**Assertion Library:**
- Not detected in application code
- Note: Node.js built-in `assert` module found in GSD tools test file only (`.claude/get-shit-done/bin/gsd-tools.test.js`)

**Run Commands:**
```bash
npm run dev              # Development server (no tests)
npm run build           # Build (no tests)
npm run lint            # ESLint only
npm run type-check      # TypeScript type checking only
```

## Test File Organization

**Location:**
- No co-located test files found in `app/`, `components/`, or `lib/` directories
- Only external test file: `.claude/get-shit-done/bin/gsd-tools.test.js` (GSD infrastructure, not application)

**Naming:**
- No application test files exist

**Structure:**
- No test directory structure established

## Test Structure

**Current State:**
- Application has no unit tests or integration tests
- Only infrastructure tests exist in `.claude/get-shit-done/bin/gsd-tools.test.js`

**Infrastructure Test Pattern** (Node.js test runner):
```javascript
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('feature name', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('should do something', () => {
    // Arrange
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-test'), { recursive: true });

    // Act
    const result = runGsdTools('command', tmpDir);

    // Assert
    assert.ok(result.success);
    assert.strictEqual(result.output.phase, '01');
  });
});
```

**Patterns Observed:**
- Setup: `beforeEach()` creates temporary directory structure
- Teardown: `afterEach()` removes temporary files
- Assertion: `assert.ok()`, `assert.strictEqual()`, `assert.deepStrictEqual()`
- File I/O for test data: `fs.mkdirSync()`, `fs.writeFileSync()`, `fs.readFileSync()`
- Helper functions: `runGsdTools()`, `createTempProject()`, `cleanup()`

## Mocking

**Framework:**
- No mocking library detected in application
- GSD tools tests use real file system operations (no mocking)

**Patterns:**
- Not applicable - no tests in application code

**What to Mock:**
- Supabase client calls (not currently tested)
- External API calls (Google Calendar integration)
- Date/time operations (for consistent test results)

**What NOT to Mock:**
- Business logic in `lib/plan-generation/` should be tested with real calculations
- Type conversions in `lib/supabase/queries.ts` (e.g., `workoutRowToWorkout()`)

## Fixtures and Factories

**Test Data:**
- Not detected

**Location:**
- No fixtures or factory files exist
- GSD tools tests generate temporary files inline

**Recommendations for Application Testing:**
```typescript
// Suggested: lib/testing/factories.ts
export const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'user-123',
  race_date: new Date('2026-06-01'),
  fitness_level: 'intermediate',
  target_hours_per_week: 10,
  weekday_time: '06:00',
  weekend_time: '08:00',
  timezone: 'UTC',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockWorkout = (overrides?: Partial<Workout>): Workout => ({
  id: 'workout-123',
  user_id: 'user-123',
  discipline: 'swim',
  workout_type: 'easy',
  duration_minutes: 45,
  scheduled_date: new Date(),
  scheduled_time: '06:00',
  status: 'scheduled',
  week_number: 1,
  phase: 'base',
  ...overrides,
});
```

## Coverage

**Requirements:**
- Not enforced
- No coverage thresholds configured
- No coverage reports generated

**View Coverage:**
- Not applicable (testing not set up)

## Test Types

**Unit Tests:**
- Not implemented
- Scope when implemented should cover:
  - `lib/plan-generation/workouts.ts` - `generateWeekWorkouts()` logic
  - `lib/plan-generation/volume.ts` - volume calculations
  - `lib/plan-generation/phases.ts` - phase calculations
  - `lib/supabase/queries.ts` - data transformation functions
  - `lib/utils.ts` - utility functions like `cn()`

**Integration Tests:**
- Not implemented
- Scope when implemented should cover:
  - API routes in `app/api/workouts/*/route.ts`
  - Supabase client interactions
  - Profile loading flow in pages

**E2E Tests:**
- Not implemented
- Framework suggestion: Playwright or Cypress
- Scope should cover:
  - User authentication flow
  - Onboarding workflow
  - Dashboard interactions
  - Workout management operations

## Common Patterns

**Async Testing:**
- Not currently used
- Pattern when implemented:
  ```typescript
  test('should fetch workout', async () => {
    const result = await getWorkout('workout-123', supabase);
    assert.ok(result);
  });
  ```

**Error Testing:**
- Not currently implemented
- Pattern when implemented:
  ```typescript
  test('should return null when workout not found', async () => {
    const result = await getWorkout('nonexistent', supabase);
    assert.strictEqual(result, null);
  });
  ```

## Testing Gaps & Recommendations

**Critical Areas Without Tests:**
1. `lib/plan-generation/` - Core business logic for:
   - Weekly workout generation
   - Volume calculations per phase
   - Phase duration calculations
   - Fitness level-based scaling

2. `lib/supabase/queries.ts` - Data transformation:
   - `combineToProfile()` combining multiple table rows
   - `workoutRowToWorkout()` date string conversion
   - Query result handling

3. API routes in `app/api/`:
   - Authentication checks
   - Authorization (user ID verification)
   - Error handling with proper HTTP status codes

4. Next.js Pages:
   - Redirect logic in `app/dashboard/page.tsx` when profile missing
   - Rendering with correct props

**Recommended Setup:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "msw": "^2.0.0"
  }
}
```

**Suggested Test File Structure:**
```
lib/
  __tests__/
    plan-generation/
      workouts.test.ts
      volume.test.ts
      phases.test.ts
    supabase/
      queries.test.ts
app/
  api/
    __tests__/
      workouts/[id]/complete/route.test.ts
  dashboard/
    __tests__/
      page.test.tsx
components/
  dashboard/
    __tests__/
      DashboardHeader.test.tsx
```

---

*Testing analysis: 2026-02-09*
