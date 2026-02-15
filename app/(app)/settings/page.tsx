import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { getProfile, getGoogleCalendarIntegration } from '@/lib/supabase/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConnectionStatus from '@/components/calendar/ConnectionStatus';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const user = await requireAuth();
  const supabase = await getSupabaseClient();

  const profile = await getProfile(user.id, supabase);
  if (!profile) {
    redirect('/onboarding');
  }

  const integration = await getGoogleCalendarIntegration(user.id, supabase);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {/* Google Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
          <CardDescription>
            Manage your Google Calendar integration for workout syncing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConnectionStatus integration={integration} variant="detailed" />
          <div className="pt-2">
            <Link href="/settings/calendar">
              <Button variant="default">Manage Calendar Connection</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Future Settings Sections */}
      {/* TODO: Add profile settings, notification preferences, training preferences, etc. */}
    </div>
  );
}
