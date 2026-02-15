'use server';

import { createClient, supabaseAdmin } from '@/lib/supabase/server';

/**
 * Store encrypted Google OAuth tokens in Supabase Vault.
 *
 * @param userId - User ID to associate tokens with
 * @param accessToken - Google OAuth access token (plaintext)
 * @param refreshToken - Google OAuth refresh token (plaintext, nullable)
 * @param expiresAt - ISO 8601 timestamp when access token expires
 * @throws Error if Vault operations or database upsert fails
 */
export async function storeGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresAt: string
): Promise<void> {
  try {
    // 1. Encrypt and store access token in Vault
    const { data: accessVaultId, error: accessVaultError } = await supabaseAdmin.rpc(
      'vault_create_secret',
      {
        secret: accessToken,
        name: `google_access_${userId}`,
        description: 'Google Calendar access token',
      }
    );

    if (accessVaultError) {
      throw new Error(`Failed to store access token in Vault: ${accessVaultError.message}`);
    }

    let refreshVaultId: string | null = null;

    // 2. If refresh token provided, encrypt and store it
    if (refreshToken) {
      const { data: refreshVaultData, error: refreshVaultError } = await supabaseAdmin.rpc(
        'vault_create_secret',
        {
          secret: refreshToken,
          name: `google_refresh_${userId}`,
          description: 'Google Calendar refresh token',
        }
      );

      if (refreshVaultError) {
        // Clean up access token if refresh token storage fails
        await supabaseAdmin.rpc('vault_delete_secret', { secret_id: accessVaultId });
        throw new Error(`Failed to store refresh token in Vault: ${refreshVaultError.message}`);
      }

      refreshVaultId = refreshVaultData;
    }

    // 3. Upsert into integrations table with Vault UUIDs
    const supabase = await createClient();
    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'google_calendar',
          access_token: accessVaultId,
          refresh_token: refreshVaultId,
          token_expires_at: expiresAt,
          is_active: true,
          last_sync_status: 'connected',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,provider',
        }
      );

    if (upsertError) {
      // Clean up Vault secrets if database upsert fails
      await supabaseAdmin.rpc('vault_delete_secret', { secret_id: accessVaultId });
      if (refreshVaultId) {
        await supabaseAdmin.rpc('vault_delete_secret', { secret_id: refreshVaultId });
      }
      throw new Error(`Failed to store integration record: ${upsertError.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error storing Google tokens');
  }
}

/**
 * Retrieve and decrypt Google OAuth tokens from Supabase Vault.
 *
 * @param userId - User ID to retrieve tokens for
 * @returns Decrypted tokens object or null if no active integration found
 */
export async function getGoogleTokens(
  userId: string
): Promise<{ access_token: string; refresh_token: string | null; expiry_date: number } | null> {
  try {
    // 1. Get integration record
    const supabase = await createClient();
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .eq('is_active', true)
      .single();

    if (fetchError || !integration) {
      return null;
    }

    if (!integration.access_token) {
      console.warn(`Integration found for user ${userId} but no access token Vault ID`);
      return null;
    }

    // 2. Decrypt access token from Vault
    const { data: accessToken, error: accessDecryptError } = await supabaseAdmin.rpc(
      'vault_read_secret',
      { secret_id: integration.access_token }
    );

    if (accessDecryptError || !accessToken) {
      console.warn(`Failed to decrypt access token for user ${userId}:`, accessDecryptError);
      return null;
    }

    // 3. Decrypt refresh token if present
    let refreshToken: string | null = null;
    if (integration.refresh_token) {
      const { data: refreshTokenData, error: refreshDecryptError } = await supabaseAdmin.rpc(
        'vault_read_secret',
        { secret_id: integration.refresh_token }
      );

      if (refreshDecryptError) {
        console.warn(`Failed to decrypt refresh token for user ${userId}:`, refreshDecryptError);
      } else {
        refreshToken = refreshTokenData;
      }
    }

    // 4. Return tokens with expiry date as epoch milliseconds
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: integration.token_expires_at
        ? new Date(integration.token_expires_at).getTime()
        : Date.now() + 3600000, // Default to 1 hour from now if missing
    };
  } catch (error) {
    console.error('Error retrieving Google tokens:', error);
    return null;
  }
}

/**
 * Update encrypted Google OAuth tokens in Supabase Vault.
 *
 * @param userId - User ID to update tokens for
 * @param tokens - Object containing new token values (partial update supported)
 * @throws Error if Vault operations or database update fails
 */
export async function updateGoogleTokens(
  userId: string,
  tokens: {
    access_token?: string;
    refresh_token?: string | null;
    expiry_date?: string;
  }
): Promise<void> {
  try {
    // 1. Get existing integration record to find Vault UUIDs
    const supabase = await createClient();
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .single();

    if (fetchError || !integration) {
      throw new Error(`No Google Calendar integration found for user ${userId}`);
    }

    // 2. Update access token in Vault if provided
    if (tokens.access_token && integration.access_token) {
      const { error: accessUpdateError } = await supabaseAdmin.rpc('vault_update_secret', {
        secret_id: integration.access_token,
        new_secret: tokens.access_token,
      });

      if (accessUpdateError) {
        throw new Error(`Failed to update access token in Vault: ${accessUpdateError.message}`);
      }
    }

    // 3. Update refresh token in Vault if provided
    if (tokens.refresh_token && integration.refresh_token) {
      const { error: refreshUpdateError } = await supabaseAdmin.rpc('vault_update_secret', {
        secret_id: integration.refresh_token,
        new_secret: tokens.refresh_token,
      });

      if (refreshUpdateError) {
        throw new Error(`Failed to update refresh token in Vault: ${refreshUpdateError.message}`);
      }
    }

    // 4. Update token_expires_at in integrations table if provided
    if (tokens.expiry_date) {
      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          token_expires_at: tokens.expiry_date,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'google_calendar');

      if (updateError) {
        throw new Error(`Failed to update integration record: ${updateError.message}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error updating Google tokens');
  }
}

/**
 * Delete encrypted Google OAuth tokens from Supabase Vault and mark integration as disconnected.
 *
 * @param userId - User ID to delete tokens for
 * @throws Error if Vault operations or database update fails
 */
export async function deleteGoogleTokens(userId: string): Promise<void> {
  try {
    // 1. Get integration record to find Vault UUIDs
    const supabase = await createClient();
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .single();

    if (fetchError || !integration) {
      throw new Error(`No Google Calendar integration found for user ${userId}`);
    }

    // 2. Delete access token from Vault
    if (integration.access_token) {
      const { error: accessDeleteError } = await supabaseAdmin.rpc('vault_delete_secret', {
        secret_id: integration.access_token,
      });

      if (accessDeleteError) {
        console.warn(`Failed to delete access token from Vault:`, accessDeleteError);
      }
    }

    // 3. Delete refresh token from Vault
    if (integration.refresh_token) {
      const { error: refreshDeleteError } = await supabaseAdmin.rpc('vault_delete_secret', {
        secret_id: integration.refresh_token,
      });

      if (refreshDeleteError) {
        console.warn(`Failed to delete refresh token from Vault:`, refreshDeleteError);
      }
    }

    // 4. Update integration record: mark as disconnected
    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        last_sync_status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google_calendar');

    if (updateError) {
      throw new Error(`Failed to update integration record: ${updateError.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error deleting Google tokens');
  }
}
