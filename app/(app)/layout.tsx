import { redirect } from 'next/navigation';
import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { getProfile, getProfileDisplay } from '@/lib/supabase/queries';
import AppHeader from '@/components/layout/AppHeader';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const supabase = await getSupabaseClient();

  const profile = await getProfile(user.id, supabase);
  if (!profile) {
    redirect('/onboarding');
  }

  const profileDisplay = await getProfileDisplay(user.id, supabase);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} profileDisplay={profileDisplay} />
      {children}
    </div>
  );
}
