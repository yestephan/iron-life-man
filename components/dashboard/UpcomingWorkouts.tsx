import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WorkoutCard from './WorkoutCard';
import type { Workout } from '@/types/database';
import { format } from 'date-fns';

interface UpcomingWorkoutsProps {
  workouts: Workout[];
}

export default function UpcomingWorkouts({ workouts }: UpcomingWorkoutsProps) {
  // Filter to only upcoming workouts and sort by date/time
  const upcoming = workouts
    .filter((w) => {
      const workoutDateTime = new Date(w.scheduled_date);
      const [hours, minutes] = w.scheduled_time.split(':').map(Number);
      workoutDateTime.setHours(hours, minutes);
      return workoutDateTime >= new Date() && w.status === 'scheduled';
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_date);
      const dateB = new Date(b.scheduled_date);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Workouts</CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((workout) => (
              <div key={workout.id} className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(workout.scheduled_date), 'EEEE, MMM d')} at{' '}
                  {workout.scheduled_time}
                </div>
                <WorkoutCard workout={workout} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No upcoming workouts scheduled</p>
            <p className="text-sm mt-2">All caught up for this week!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
