'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import WorkoutActions from '@/components/workouts/WorkoutActions';
import type { Workout } from '@/types/database';

interface WorkoutCardProps {
  workout: Workout;
  compact?: boolean;
}

const activityName = (workout: Workout) =>
  `${workout.discipline.charAt(0).toUpperCase() + workout.discipline.slice(1)} - ${workout.workout_type.charAt(0).toUpperCase() + workout.workout_type.slice(1)}`;

export default function WorkoutCard({ workout, compact = false }: WorkoutCardProps) {
  const disciplineColors = {
    swim: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950',
    bike: 'border-green-500 bg-green-50 dark:bg-green-950',
    run: 'border-red-500 bg-red-50 dark:bg-red-950',
  };

  const statusIcons = {
    scheduled: <Circle className="w-4 h-4 text-muted-foreground" />,
    completed: <CheckCircle2 className="w-4 h-4 text-muted-foreground" />,
    skipped: <Circle className="w-4 h-4 text-muted-foreground" />,
  };

  if (compact) {
    return (
      <div
        className={`p-2 rounded border-l-4 ${disciplineColors[workout.discipline]} text-xs space-y-1`}
      >
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs font-normal">
            {activityName(workout)}
          </Badge>
          {statusIcons[workout.status]}
        </div>
        <div className="text-muted-foreground">{workout.duration_minutes}min</div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${disciplineColors[workout.discipline]} space-y-2`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{activityName(workout)}</Badge>
          <div className="text-sm text-muted-foreground">{workout.duration_minutes} minutes</div>
        </div>
        {statusIcons[workout.status]}
      </div>
      <p className="text-sm text-muted-foreground">{workout.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            Week {workout.week_number}
          </Badge>
          <span>•</span>
          <span>{workout.scheduled_time}</span>
        </div>
        <WorkoutActions workout={workout} />
      </div>
    </div>
  );
}
