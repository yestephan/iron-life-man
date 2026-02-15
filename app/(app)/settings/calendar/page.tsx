import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { getGoogleCalendarIntegration } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import CalendarSettings from '@/components/calendar/CalendarSettings';
import Link from 'next/link';

export default async function CalendarSettingsPage() {
  const user = await requireAuth();
  const supabase = await getSupabaseClient();

  const integration = await getGoogleCalendarIntegration(user.id, supabase);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Google Calendar integration
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      <CalendarSettings userId={user.id} integration={integration} />
    </div>
  );
}
