---
phase: 01-oauth-foundation
plan: 01
subsystem: data-security
tags:
  - vault
  - encryption
  - oauth
  - security
  - data-model
  - timezone
dependency_graph:
  requires: []
  provides:
    - vault_rpc_functions
    - encrypted_token_storage
    - workout_timezone_support
  affects:
    - integrations_table
    - workouts_table
    - oauth_implementation
tech_stack:
  added:
    - Supabase Vault extension
    - pgsodium (Vault dependency)
  patterns:
    - RPC wrapper functions with SECURITY DEFINER
    - Vault UUID storage pattern
    - IANA timezone preservation
key_files:
  created:
    - supabase/migrations/005_vault_setup.sql
    - supabase/migrations/006_update_integrations_for_vault.sql
  modified:
    - types/database.ts
    - lib/supabase/queries.ts
decisions:
  - choice: "Use Vault RPC wrapper functions instead of direct vault access"
    rationale: "Security layer with auth.uid() checks prevents users from accessing other users' secrets"
  - choice: "Store Vault UUIDs in existing TEXT columns (access_token, refresh_token)"
    rationale: "Non-destructive migration - semantic change only, no schema alteration needed"
  - choice: "Default workouts.timezone to 'UTC'"
    rationale: "Safe default for existing workouts, preserves data integrity during migration"
  - choice: "timezone field is optional (nullable) in Workout interface"
    rationale: "Backward compatibility - existing code doesn't need timezone handling immediately"
metrics:
  duration_minutes: 3
  completed_date: "2026-02-15"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  migrations_added: 2
  commits: 2
---

# Phase 1 Plan 1: Vault Setup & Data Model Updates

**One-liner:** Supabase Vault RPC functions for encrypted OAuth token storage with IANA timezone support for workouts

## Overview

Established the foundation for secure OAuth token storage using Supabase Vault extension. Created four RPC wrapper functions (create, read, update, delete) with authentication checks to ensure users can only access their own encrypted secrets. Added IANA timezone column to workouts table to preserve local time across DST transitions. Updated TypeScript types to reflect Vault-aware integration model.

## Tasks Completed

### Task 1: Create Vault Extension and RPC Wrapper Migrations

**Commit:** 86286bc

Created two SQL migration files:

1. **005_vault_setup.sql** - Vault extension and RPC functions:
   - Enabled `vault` extension with schema isolation
   - Created `vault_create_secret(secret, name, description)` - encrypts tokens, returns UUID
   - Created `vault_read_secret(secret_id)` - retrieves decrypted token by UUID
   - Created `vault_update_secret(secret_id, new_secret, new_name)` - updates encrypted token
   - Created `vault_delete_secret(secret_id)` - removes secret from Vault
   - All functions include `auth.uid()` checks for security
   - Granted EXECUTE permissions to `authenticated` role

2. **006_update_integrations_for_vault.sql** - Schema updates and documentation:
   - Added `workouts.timezone VARCHAR(50) DEFAULT 'UTC'` for IANA timezone names
   - Added index on `workouts.timezone` for timezone-based queries
   - Added COMMENT on `integrations.access_token` documenting Vault UUID storage
   - Added COMMENT on `integrations.refresh_token` documenting Vault UUID storage
   - No destructive changes - existing columns remain unchanged

**Key Design:**
- RPC wrappers provide security layer preventing cross-user secret access
- SECURITY DEFINER elevation with explicit auth checks
- Non-destructive migration strategy (semantic change only)

### Task 2: Update TypeScript Types for Vault-Based Token Storage

**Commit:** 6af4467

Updated TypeScript type definitions:

1. **types/database.ts** - Added new types and updated existing interfaces:
   - Added `SyncStatus` type: `'connected' | 'disconnected' | 'error' | 'needs_reconnection'`
   - Added `timezone?: string` to `Workout` interface (IANA timezone name)
   - Added `timezone: string | null` to `WorkoutRow` interface
   - Added JSDoc comments to `Integration.access_token` and `refresh_token` fields explaining Vault UUID storage
   - Created `GoogleCalendarIntegration` convenience type with `access_token_vault_id` and `refresh_token_vault_id` fields

2. **lib/supabase/queries.ts** - Fixed type compatibility issues:
   - Updated `workoutRowToWorkout()` helper to convert `timezone` field from `null` to `undefined`
   - Updated `createWorkouts()` to include `timezone` field in insert data
   - Ensured backward compatibility with existing code

**Type Safety:**
- All changes compile without errors in modified files
- Maintained backward compatibility with existing codebase
- Pre-existing errors in other files remain (unrelated to our changes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed timezone type mismatch in queries helper**
- **Found during:** Task 2 verification (TypeScript compilation)
- **Issue:** `workoutRowToWorkout()` function didn't handle the new `timezone` field, causing type error where `WorkoutRow.timezone` (string | null) couldn't be assigned to `Workout.timezone` (string | undefined)
- **Fix:** Added `timezone: row.timezone ?? undefined` conversion in `workoutRowToWorkout()` to convert null to undefined matching the interface contract. Also updated `createWorkouts()` to include timezone in insert data.
- **Files modified:** lib/supabase/queries.ts
- **Commit:** 6af4467 (included in Task 2 commit)
- **Rationale:** This was a correctness issue - the type mismatch would have caused runtime errors when querying workouts. The fix ensures proper null handling and maintains type safety.

## Verification Results

All success criteria met:

1. ✅ Both migration SQL files exist in `supabase/migrations/` with correct numbering (005, 006)
2. ✅ TypeScript compilation passes with no errors in modified files
3. ✅ All 4 Vault RPC wrapper functions present (create, read, update, delete)
4. ✅ Workouts timezone column defaults to 'UTC' with index
5. ✅ No existing functionality broken (pre-existing errors unrelated to our changes)

**Migration Files:**
- `005_vault_setup.sql` - 5,586 bytes, 4 RPC functions, auth checks on all functions
- `006_update_integrations_for_vault.sql` - 3,534 bytes, timezone column + comments

**TypeScript Validation:**
- No errors in `types/database.ts`
- No errors in `lib/supabase/queries.ts`
- All new types properly exported and documented

## Dependencies & Integration Points

**Requires:**
- Supabase Vault extension enabled in Dashboard (user setup required)
- pgsodium extension enabled (Vault dependency)

**Provides:**
- `vault_create_secret()` RPC function - encrypts and stores secrets
- `vault_read_secret()` RPC function - retrieves decrypted secrets
- `vault_update_secret()` RPC function - updates encrypted secrets
- `vault_delete_secret()` RPC function - removes secrets
- `workouts.timezone` column - IANA timezone storage
- `GoogleCalendarIntegration` type - type-safe Google Calendar integration interface

**Affects:**
- Plan 01-02: OAuth flow will use these Vault functions to store tokens
- Plan 01-03: Token refresh will use vault_read_secret() and vault_update_secret()
- Plan 01-04: Calendar sync will read tokens via vault_read_secret()
- All future workout creation code should set timezone field

## Usage Patterns

### Storing OAuth Tokens

```sql
-- 1. Encrypt and store access token
SELECT vault_create_secret('access_token_value', 'google_access_token_user_123');
-- Returns: 'uuid-here'

-- 2. Store UUID in integrations table
UPDATE integrations
SET access_token = 'uuid-here'
WHERE user_id = 'user-123' AND provider = 'google_calendar';
```

### Retrieving OAuth Tokens

```sql
-- 1. Get UUID from integrations table
SELECT access_token FROM integrations
WHERE user_id = auth.uid() AND provider = 'google_calendar';

-- 2. Decrypt token using UUID
SELECT vault_read_secret('uuid-here');
-- Returns: 'access_token_value'
```

### Creating Workouts with Timezone

```typescript
await createWorkouts([{
  user_id: userId,
  discipline: 'run',
  workout_type: 'easy',
  duration_minutes: 45,
  scheduled_date: new Date('2026-02-16'),
  scheduled_time: '07:00',
  description: 'Easy run',
  status: 'scheduled',
  week_number: 1,
  phase: 'base',
  timezone: 'America/New_York' // Preserves local time across DST
}]);
```

## Next Steps

1. **User Setup Required (before next plan):**
   - Enable Vault extension in Supabase Dashboard (Database > Extensions > search "vault")
   - Enable pgsodium extension (Vault dependency)
   - Run migrations: `005_vault_setup.sql` and `006_update_integrations_for_vault.sql`

2. **Plan 01-02 Dependencies:**
   - Google Cloud OAuth credentials setup
   - OAuth flow implementation will use `vault_create_secret()`
   - Token storage in integrations table

3. **Plan 01-03 Dependencies:**
   - Token refresh logic will use `vault_read_secret()` and `vault_update_secret()`

4. **Plan 01-04 Dependencies:**
   - Calendar sync will use `vault_read_secret()` to retrieve tokens

## Self-Check: PASSED

### Files Created

✅ **supabase/migrations/005_vault_setup.sql**
```bash
$ [ -f "/Users/stephanye/Documents/iron-life-man/supabase/migrations/005_vault_setup.sql" ] && echo "FOUND" || echo "MISSING"
FOUND
```

✅ **supabase/migrations/006_update_integrations_for_vault.sql**
```bash
$ [ -f "/Users/stephanye/Documents/iron-life-man/supabase/migrations/006_update_integrations_for_vault.sql" ] && echo "FOUND" || echo "MISSING"
FOUND
```

### Files Modified

✅ **types/database.ts** - Contains SyncStatus, timezone fields, GoogleCalendarIntegration
✅ **lib/supabase/queries.ts** - Contains timezone handling in helpers

### Commits Verified

✅ **Task 1 commit (86286bc)**
```bash
$ git log --oneline --all | grep -q "86286bc" && echo "FOUND" || echo "MISSING"
FOUND
```

✅ **Task 2 commit (6af4467)**
```bash
$ git log --oneline --all | grep -q "6af4467" && echo "FOUND" || echo "MISSING"
FOUND
```

### Migration File Validation

✅ **4 RPC functions in 005_vault_setup.sql**
```bash
$ grep -c "CREATE OR REPLACE FUNCTION vault_" /Users/stephanye/Documents/iron-life-man/supabase/migrations/005_vault_setup.sql
4
```

✅ **Timezone column in 006_update_integrations_for_vault.sql**
```bash
$ grep "timezone VARCHAR" /Users/stephanye/Documents/iron-life-man/supabase/migrations/006_update_integrations_for_vault.sql
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
```

All verifications passed. Plan executed successfully with all artifacts created and committed.
