import { Card, CardContent } from '@/components/ui/card';
import type { Workout, Discipline } from '@/types/database';

interface VolumeTrackingProps {
  workouts: Workout[];
}

function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

function getZoneFromWorkoutType(
  workoutType: string
): 'zone2' | 'zone3' | 'zone4' | null {
  switch (workoutType) {
    case 'easy':
    case 'long':
      return 'zone2';
    case 'tempo':
      return 'zone3';
    case 'intervals':
      return 'zone4';
    default:
      return null;
  }
}

function calculateVolumeStats(workouts: Workout[]) {
  const completedWorkouts = workouts.filter((w) => w.status === 'completed');

  const disciplineMinutes: Record<Discipline, number> = {
    swim: 0,
    bike: 0,
    run: 0,
  };

  const zoneMinutes: Record<'zone2' | 'zone3' | 'zone4', number> = {
    zone2: 0,
    zone3: 0,
    zone4: 0,
  };

  completedWorkouts.forEach((w) => {
    disciplineMinutes[w.discipline] += w.duration_minutes;
    const zone = getZoneFromWorkoutType(w.workout_type);
    if (zone) {
      zoneMinutes[zone] += w.duration_minutes;
    }
  });

  const totalMinutes = completedWorkouts.reduce((sum, w) => sum + w.duration_minutes, 0);

  return {
    totalMinutes,
    disciplineMinutes,
    zoneMinutes,
  };
}

interface SummaryCardProps {
  totalLabel: string;
  totalValue: string;
  categories: { value: string; label: string }[];
}

function SummaryCard({ totalLabel, totalValue, categories }: SummaryCardProps) {
  return (
    <Card className="rounded-lg border bg-card shadow-sm">
      <CardContent className="p-6">
        <div className="text-3xl font-bold">{totalValue}</div>
        <div className="text-sm text-muted-foreground mb-6">{totalLabel}</div>
        <div className="flex justify-between gap-4">
          {categories.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className="text-xl font-bold">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VolumeTracking({ workouts }: VolumeTrackingProps) {
  const { totalMinutes, disciplineMinutes, zoneMinutes } = calculateVolumeStats(workouts);
  const totalFormatted = formatHoursMinutes(totalMinutes);

  const disciplineCard = (
    <SummaryCard
      totalLabel="Total hr"
      totalValue={totalFormatted}
      categories={[
        { value: formatHoursMinutes(disciplineMinutes.swim), label: 'Swim' },
        { value: formatHoursMinutes(disciplineMinutes.bike), label: 'Bike' },
        { value: formatHoursMinutes(disciplineMinutes.run), label: 'Run' },
      ]}
    />
  );

  const zoneCard = (
    <SummaryCard
      totalLabel="Total hr"
      totalValue={totalFormatted}
      categories={[
        { value: formatHoursMinutes(zoneMinutes.zone2), label: 'Zone 2' },
        { value: formatHoursMinutes(zoneMinutes.zone3), label: 'Zone 3' },
        { value: formatHoursMinutes(zoneMinutes.zone4), label: 'Zone 4' },
      ]}
    />
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {disciplineCard}
      {zoneCard}
    </div>
  );
}
