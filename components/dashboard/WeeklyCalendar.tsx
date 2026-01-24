'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WorkoutCard from './WorkoutCard';
import type { Workout } from '@/types/database';
import { format, addDays } from 'date-fns';

interface WeeklyCalendarProps {
  workouts: Workout[];
  weekStart: Date;
}

export default function WeeklyCalendar({ workouts, weekStart }: WeeklyCalendarProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getWorkoutsForDay = (dayIndex: number) => {
    const targetDate = addDays(weekStart, dayIndex);
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    return workouts.filter((workout) => {
      const workoutDateStr = format(new Date(workout.scheduled_date), 'yyyy-MM-dd');
      return workoutDateStr === dateStr;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((day, index) => {
            const date = addDays(weekStart, index);
            const dayWorkouts = getWorkoutsForDay(index);
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <div
                key={day}
                className={`p-3 rounded-lg border ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-muted-foreground">{day}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(date, 'd')}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayWorkouts.length > 0 ? (
                    dayWorkouts.map((workout) => (
                      <WorkoutCard key={workout.id} workout={workout} compact />
                    ))
                  ) : (
                    <div className="text-xs text-center text-muted-foreground py-2">
                      Rest day
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
