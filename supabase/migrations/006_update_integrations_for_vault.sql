-- ============================================================================
-- UPDATE INTEGRATIONS FOR VAULT + ADD WORKOUT TIMEZONE
-- ============================================================================
-- Purpose:
--   1. Document that integrations table now stores Vault secret UUIDs
--   2. Add timezone support to workouts table (DATA-01)

-- ============================================================================
-- 1. ADD TIMEZONE TO WORKOUTS
-- ============================================================================
-- Store IANA timezone name (e.g., 'America/New_York') for each workout.
-- This preserves the user's timezone at the time of workout creation, ensuring
-- that DST transitions don't shift scheduled times. For example, a workout
-- scheduled for "7:00 AM America/New_York" remains at 7:00 AM local time
-- regardless of whether DST is active.

ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add comment explaining the purpose
COMMENT ON COLUMN workouts.timezone IS
  'IANA timezone name (e.g., America/New_York) for this workout. Preserves local time across DST transitions. Defaults to UTC for workouts created before this migration.';

-- Index for timezone-based queries
CREATE INDEX IF NOT EXISTS idx_workouts_timezone ON workouts(timezone);

-- ============================================================================
-- 2. DOCUMENT VAULT USAGE IN INTEGRATIONS TABLE
-- ============================================================================
-- The integrations.access_token and integrations.refresh_token columns now store
-- Vault secret UUIDs (as TEXT) instead of plaintext tokens. This is a semantic
-- change only - no schema alteration needed since TEXT can store UUIDs.
--
-- Migration strategy:
--   - Existing NULL values remain NULL (no integration connected yet)
--   - When OAuth flow completes, tokens are encrypted via vault_create_secret()
--   - The returned UUID is stored in these columns as text
--   - Token retrieval uses vault_read_secret(uuid)
--
-- This approach satisfies DATA-03: "All OAuth tokens must be encrypted at rest"

COMMENT ON COLUMN integrations.access_token IS
  'Vault secret UUID (stored as TEXT) referencing encrypted OAuth access token. For security, actual token values are never stored in plaintext. Use vault_read_secret(access_token) to retrieve the decrypted token.';

COMMENT ON COLUMN integrations.refresh_token IS
  'Vault secret UUID (stored as TEXT) referencing encrypted OAuth refresh token. For security, actual token values are never stored in plaintext. Use vault_read_secret(refresh_token) to retrieve the decrypted token.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration is non-destructive:
--   - No data is altered or deleted
--   - Existing integrations table columns remain unchanged
--   - New timezone column added to workouts with safe default
--
-- Application-level changes required:
--   1. When storing OAuth tokens:
--      - Call vault_create_secret(token_value, name)
--      - Store returned UUID in access_token/refresh_token column
--   2. When reading OAuth tokens:
--      - Call vault_read_secret(uuid) with stored UUID
--   3. When creating workouts:
--      - Set timezone from user's current timezone or preference
--   4. When displaying workouts:
--      - Use timezone column to convert to user's local time
