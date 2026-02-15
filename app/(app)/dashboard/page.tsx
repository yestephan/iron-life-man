import { redirect } from 'next/navigation';
import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { getProfile, getWorkouts, getGoogleCalendarIntegration } from '@/lib/supabase/queries';
import { getCurrentWeekNumber, calculatePhases, getTrainingStartDate } from '@/lib/plan-generation/phases';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import VolumeTracking from '@/components/dashboard/VolumeTracking';
import WeeklyCalendar from '@/components/dashboard/WeeklyCalendar';
import UpcomingWorkouts from '@/components/dashboard/UpcomingWorkouts';

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await getSupabaseClient();

  const profile = await getProfile(user.id, supabase);
  if (!profile) {
    redirect('/onboarding');
  }

  // Get Google Calendar integration status
  const integration = await getGoogleCalendarIntegration(user.id, supabase);

  // Get current week and phases
  const currentWeek = getCurrentWeekNumber(profile.race_date);
  const phases = calculatePhases(profile.race_date);

  // Get workouts for current training week (not calendar week)
  const workouts = await getWorkouts(
    user.id,
    {
      weekNumber: currentWeek,
    },
    supabase
  );

  // Calculate week start date for current training week
  const trainingStart = getTrainingStartDate(profile.race_date);
  const weekStartDate = new Date(trainingStart);
  weekStartDate.setDate(trainingStart.getDate() + (currentWeek - 1) * 7);

  // Adjust to Sunday (week starts on Sunday)
  const dayOfWeek = weekStartDate.getDay();
  const daysToSunday = dayOfWeek === 0 ? 0 : -dayOfWeek;
  weekStartDate.setDate(weekStartDate.getDate() + daysToSunday);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DashboardHeader
        currentWeek={currentWeek}
        totalWeeks={phases.totalWeeks}
        phase={workouts[0]?.phase || 'base'}
        raceDate={profile.race_date}
        calendarStatus={integration}
      />

      {workouts.length === 0 && currentWeek > 3 && (
        <div className="p-4 bg-muted border border-border rounded-lg">
          <p className="text-muted-foreground">
            Your workouts for week {currentWeek} haven't been generated yet. New workouts are generated every Sunday.
          </p>
        </div>
      )}

      <VolumeTracking workouts={workouts} />

      <WeeklyCalendar
        workouts={workouts}
        weekStart={weekStartDate}
        timezone={profile.timezone}
      />

      <UpcomingWorkouts workouts={workouts} />
    </div>
  );
}
