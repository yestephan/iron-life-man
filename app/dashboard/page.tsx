import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfile, getWorkouts } from '@/lib/supabase/queries';
import { getCurrentWeekNumber, calculatePhases } from '@/lib/plan-generation/phases';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import VolumeTracking from '@/components/dashboard/VolumeTracking';
import WeeklyCalendar from '@/components/dashboard/WeeklyCalendar';
import UpcomingWorkouts from '@/components/dashboard/UpcomingWorkouts';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  const profile = await getProfile(session.user.id);
  if (!profile) {
    redirect('/onboarding');
  }

  // Get current week and phases
  const currentWeek = getCurrentWeekNumber(profile.race_date);
  const phases = calculatePhases(profile.race_date);

  // Get current week's workouts
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  const workouts = await getWorkouts(session.user.id, {
    startDate: startOfWeek,
    endDate: endOfWeek,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <DashboardHeader
          currentWeek={currentWeek}
          totalWeeks={phases.totalWeeks}
          phase={workouts[0]?.phase || 'base'}
          raceDate={profile.race_date}
        />

        <VolumeTracking workouts={workouts} />

        <WeeklyCalendar
          workouts={workouts}
          weekStart={startOfWeek}
        />

        <UpcomingWorkouts workouts={workouts} />
      </div>
    </div>
  );
}
