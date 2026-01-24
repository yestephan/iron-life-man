import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile } from '@/lib/supabase/queries';

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/signin');
  }

  // Check if user has completed onboarding
  const profile = await getProfile(session.user.id);

  if (!profile) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}
