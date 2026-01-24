import { DISCIPLINE_RATIOS, WEEKLY_TEMPLATE } from './constants';
import { getPhaseForWeek } from './phases';
import { calculateWeeklyVolume } from './volume';
import type { Discipline, WorkoutType, Workout, Profile } from '@/types/database';
import type { PhaseBreakdown } from './phases';

export interface WorkoutTemplate {
  discipline: Discipline;
  workout_type: WorkoutType;
  duration_minutes: number;
  day: string;
  description: string;
}

export function generateWeekWorkouts(
  userId: string,
  weekNumber: number,
  weekStartDate: Date,
  profile: Profile,
  phases: PhaseBreakdown
): Omit<Workout, 'id' | 'created_at' | 'updated_at'>[] {
  const phase = getPhaseForWeek(weekNumber, phases);
  const weeklyHours = calculateWeeklyVolume(
    weekNumber,
    phase,
    profile.target_hours_per_week,
    profile.fitness_level,
    phases
  );

  const swimHours = weeklyHours * DISCIPLINE_RATIOS.swim;
  const bikeHours = weeklyHours * DISCIPLINE_RATIOS.bike;
  const runHours = weeklyHours * DISCIPLINE_RATIOS.run;

  const workouts: Omit<Workout, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Generate swim workouts
  WEEKLY_TEMPLATE.swim.forEach((template) => {
    workouts.push({
      user_id: userId,
      discipline: 'swim',
      workout_type: template.type,
      duration_minutes: Math.round(swimHours * template.volumePct * 60),
      scheduled_date: getNextDayOfWeek(weekStartDate, template.day),
      scheduled_time: profile.weekday_time,
      description: getWorkoutDescription('swim', template.type),
      status: 'scheduled',
      week_number: weekNumber,
      phase,
    });
  });

  // Generate bike workouts
  WEEKLY_TEMPLATE.bike.forEach((template) => {
    const isWeekend = template.day === 'saturday' || template.day === 'sunday';
    workouts.push({
      user_id: userId,
      discipline: 'bike',
      workout_type: template.type,
      duration_minutes: Math.round(bikeHours * template.volumePct * 60),
      scheduled_date: getNextDayOfWeek(weekStartDate, template.day),
      scheduled_time: isWeekend ? profile.weekend_time : profile.weekday_time,
      description: getWorkoutDescription('bike', template.type),
      status: 'scheduled',
      week_number: weekNumber,
      phase,
    });
  });

  // Generate run workouts
  WEEKLY_TEMPLATE.run.forEach((template) => {
    const isWeekend = template.day === 'saturday' || template.day === 'sunday';
    workouts.push({
      user_id: userId,
      discipline: 'run',
      workout_type: template.type,
      duration_minutes: Math.round(runHours * template.volumePct * 60),
      scheduled_date: getNextDayOfWeek(weekStartDate, template.day),
      scheduled_time: isWeekend ? profile.weekend_time : profile.weekday_time,
      description: getWorkoutDescription('run', template.type),
      status: 'scheduled',
      week_number: weekNumber,
      phase,
    });
  });

  return workouts;
}

function getNextDayOfWeek(startDate: Date, dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  const currentDay = startDate.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;

  const result = new Date(startDate);
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

function getWorkoutDescription(discipline: Discipline, type: WorkoutType): string {
  const descriptions = {
    swim: {
      easy: 'Easy swim - Focus on technique and efficiency. Keep effort conversational.',
      tempo: 'Tempo swim - Sustained moderate effort. Build endurance at race pace.',
      intervals: 'Swim intervals - Build speed and power. Alternate hard efforts with recovery.',
      long: 'Long swim - Build aerobic endurance. Steady, sustainable pace.',
    },
    bike: {
      easy: 'Easy spin - Recovery pace. Keep cadence high, resistance low.',
      tempo: 'Tempo ride - Sustained moderate effort. Build strength and endurance.',
      intervals: 'Bike intervals - Build power and speed. Alternate hard efforts with recovery.',
      long: 'Long ride - Build aerobic endurance. Steady pace you can sustain for hours.',
    },
    run: {
      easy: 'Easy run - Conversational pace. Focus on form and aerobic development.',
      tempo: 'Tempo run - Comfortably hard pace. Build lactate threshold.',
      intervals: 'Run intervals - Build speed and VO2max. Alternate hard efforts with recovery.',
      long: 'Long run - Build endurance. Steady pace, practice race nutrition.',
    },
  };

  return descriptions[discipline][type];
}

// Helper to get the start of the week (Monday) for a given date
export function getWeekStartDate(date: Date, weekNumber: number, trainingStartDate: Date): Date {
  const weekStart = new Date(trainingStartDate);
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);

  // Adjust to Monday if training doesn't start on Monday
  const dayOfWeek = weekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + daysToMonday);

  return weekStart;
}
