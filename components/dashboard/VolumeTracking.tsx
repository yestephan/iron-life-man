import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Workout, Discipline } from '@/types/database';

interface VolumeTrackingProps {
  workouts: Workout[];
}

interface VolumeStats {
  completed: number;
  target: number;
  percentage: number;
}

function calculateVolumeStats(workouts: Workout[]) {
  const stats = {
    swim: { completed: 0, target: 0, percentage: 0 },
    bike: { completed: 0, target: 0, percentage: 0 },
    run: { completed: 0, target: 0, percentage: 0 },
  };

  ['swim', 'bike', 'run'].forEach((discipline) => {
    const disciplineWorkouts = workouts.filter(
      (w) => w.discipline === discipline
    );

    const target =
      disciplineWorkouts.reduce((sum, w) => sum + w.duration_minutes, 0) / 60;

    const completed =
      disciplineWorkouts
        .filter((w) => w.status === 'completed')
        .reduce((sum, w) => sum + w.duration_minutes, 0) / 60;

    stats[discipline as Discipline] = {
      completed: Math.round(completed * 10) / 10,
      target: Math.round(target * 10) / 10,
      percentage: target > 0 ? Math.round((completed / target) * 100) : 0,
    };
  });

  return stats;
}

export default function VolumeTracking({ workouts }: VolumeTrackingProps) {
  const stats = calculateVolumeStats(workouts);

  const disciplines = [
    { key: 'swim' as const, label: 'Swim', emoji: '🏊', color: 'text-cyan-600' },
    { key: 'bike' as const, label: 'Bike', emoji: '🚴', color: 'text-green-600' },
    { key: 'run' as const, label: 'Run', emoji: '🏃', color: 'text-red-600' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {disciplines.map(({ key, label, emoji, color }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <span className="mr-2">{emoji}</span>
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-bold ${color}`}>
                  {stats[key].completed}h
                </div>
                <div className="text-sm text-muted-foreground">
                  / {stats[key].target}h
                </div>
              </div>
              <Progress value={stats[key].percentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {stats[key].percentage}% complete
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
