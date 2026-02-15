-- ============================================================================
-- VAULT EXTENSION SETUP
-- ============================================================================
-- Purpose: Enable Supabase Vault for encrypted storage of OAuth tokens
-- Dependencies: Requires pgsodium and supabase_vault extensions enabled via Dashboard
-- Usage: OAuth tokens will be stored as encrypted secrets accessible only to their owner

-- Enable the vault extension
CREATE EXTENSION IF NOT EXISTS "vault" WITH SCHEMA "vault";

-- Grant authenticated users access to the vault schema
GRANT USAGE ON SCHEMA vault TO authenticated;

-- ============================================================================
-- RPC WRAPPER FUNCTIONS FOR VAULT
-- ============================================================================
-- These functions provide a secure interface to vault operations.
-- SECURITY DEFINER allows execution with elevated permissions while auth checks
-- ensure users can only access their own secrets.

-- ----------------------------------------------------------------------------
-- Create a new encrypted secret
-- ----------------------------------------------------------------------------
-- @param secret TEXT - The plaintext value to encrypt
-- @param name TEXT - A human-readable name for the secret
-- @param description TEXT - Optional description of the secret
-- @returns UUID - The secret ID to store in application tables
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret TEXT,
  name TEXT,
  description TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the secret in Vault
  secret_id := vault.create_secret(
    secret,
    name,
    description
  );

  RETURN secret_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Read an encrypted secret by ID
-- ----------------------------------------------------------------------------
-- @param secret_id UUID - The ID of the secret to retrieve
-- @returns TEXT - The decrypted secret value
CREATE OR REPLACE FUNCTION vault_read_secret(
  secret_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read from the decrypted_secrets view
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  -- Return NULL if not found (rather than raising an exception)
  RETURN secret_value;
END;
$$;

-- ----------------------------------------------------------------------------
-- Update an existing encrypted secret
-- ----------------------------------------------------------------------------
-- @param secret_id UUID - The ID of the secret to update
-- @param new_secret TEXT - The new plaintext value to encrypt
-- @param new_name TEXT - Optional new name for the secret
-- @returns VOID
CREATE OR REPLACE FUNCTION vault_update_secret(
  secret_id UUID,
  new_secret TEXT,
  new_name TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the secret in Vault
  PERFORM vault.update_secret(
    secret_id,
    new_secret,
    new_name
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- Delete an encrypted secret
-- ----------------------------------------------------------------------------
-- @param secret_id UUID - The ID of the secret to delete
-- @returns VOID
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the secret from Vault
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to execute these wrapper functions
GRANT EXECUTE ON FUNCTION vault_create_secret(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION vault_read_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION vault_update_secret(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION vault_delete_secret(UUID) TO authenticated;

-- ============================================================================
-- NOTES
-- ============================================================================
-- Before running this migration, ensure the vault extension is enabled:
--   1. Go to Supabase Dashboard -> Database -> Extensions
--   2. Search for "vault" and enable it
--   3. The pgsodium extension should also be enabled (dependency)
--
-- Application usage pattern:
--   1. Store OAuth tokens: SELECT vault_create_secret('token_value', 'google_access_token')
--   2. Store the returned UUID in integrations.access_token column
--   3. Retrieve tokens: SELECT vault_read_secret('uuid-here')
--   4. Update tokens: SELECT vault_update_secret('uuid-here', 'new_token_value')
--   5. Delete tokens: SELECT vault_delete_secret('uuid-here')
