import { createClient } from './server';
import { redirect } from 'next/navigation';

/**
 * Gets the current authenticated user session.
 * Returns null if not authenticated.
 * Use this in Server Components and Server Actions.
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Gets the current authenticated user.
 * Returns null if not authenticated.
 * Use this in Server Components and Server Actions.
 */
export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Requires authentication - redirects to sign-in if not authenticated.
 * Returns the authenticated user.
 * Use this in Server Components and Server Actions that require auth.
 */
export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect('/signin');
  }
  return user;
}

/**
 * Gets the Supabase client with the current user's session.
 * Use this in Server Components and Server Actions.
 */
export async function getSupabaseClient() {
  return await createClient();
}
