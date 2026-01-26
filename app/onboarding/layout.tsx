import { redirect } from 'next/navigation';
import { getUser, getSupabaseClient } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/supabase/queries';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  // If user is logged in, check if they already have a profile
  if (user?.id) {
    const supabase = await getSupabaseClient();
    const profile = await getProfile(user.id, supabase);

    // If profile exists, redirect to dashboard
    if (profile) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
