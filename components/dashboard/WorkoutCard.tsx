'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Waves, Bike, Footprints } from 'lucide-react';
import WorkoutActions from '@/components/workouts/WorkoutActions';
import type { Workout } from '@/types/database';

interface WorkoutCardProps {
  workout: Workout;
  compact?: boolean;
}

export default function WorkoutCard({ workout, compact = false }: WorkoutCardProps) {
  const disciplineColors = {
    swim: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950',
    bike: 'border-green-500 bg-green-50 dark:bg-green-950',
    run: 'border-red-500 bg-red-50 dark:bg-red-950',
  };

  const disciplineIconColors = {
    swim: 'text-cyan-600 dark:text-cyan-400',
    bike: 'text-green-600 dark:text-green-400',
    run: 'text-red-600 dark:text-red-400',
  };

  const disciplineIcons = {
    swim: <Waves className={`w-5 h-5 ${disciplineIconColors.swim}`} />,
    bike: <Bike className={`w-5 h-5 ${disciplineIconColors.bike}`} />,
    run: <Footprints className={`w-5 h-5 ${disciplineIconColors.run}`} />,
  };

  const disciplineIconsCompact = {
    swim: <Waves className={`w-4 h-4 ${disciplineIconColors.swim}`} />,
    bike: <Bike className={`w-4 h-4 ${disciplineIconColors.bike}`} />,
    run: <Footprints className={`w-4 h-4 ${disciplineIconColors.run}`} />,
  };

  const statusIcons = {
    scheduled: <Circle className="w-4 h-4 text-muted-foreground" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    skipped: <Circle className="w-4 h-4 text-gray-400" />,
  };

  if (compact) {
    return (
      <div
        className={`p-2 rounded border-l-4 ${disciplineColors[workout.discipline]} text-xs space-y-1`}
      >
        <div className="flex items-center justify-between">
          <span>{disciplineIconsCompact[workout.discipline]}</span>
          {statusIcons[workout.status]}
        </div>
        <div className="font-medium capitalize">{workout.workout_type}</div>
        <div className="text-muted-foreground">{workout.duration_minutes}min</div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${disciplineColors[workout.discipline]} space-y-2`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {disciplineIcons[workout.discipline]}
          <div>
            <div className="font-semibold capitalize">
              {workout.discipline} - {workout.workout_type}
            </div>
            <div className="text-sm text-muted-foreground">{workout.duration_minutes} minutes</div>
          </div>
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
