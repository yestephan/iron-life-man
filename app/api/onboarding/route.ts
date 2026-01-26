import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { createProfile, createWorkouts, getProfile } from '@/lib/supabase/queries';
import { calculatePhases, getTrainingStartDate } from '@/lib/plan-generation/phases';
import { generateWeekWorkouts, getWeekStartDate } from '@/lib/plan-generation/workouts';
import type { FitnessLevel } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await getSupabaseClient();

    // Check if user already has a profile
    const existingProfile = await getProfile(user.id, supabase);

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists. Please update your settings instead.' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { raceDate, fitnessLevel, targetHours, weekdayTime, weekendTime, timezone } = body;

    // Validate inputs
    if (!raceDate || !fitnessLevel || !targetHours || !weekdayTime || !weekendTime || !timezone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const raceDateObj = new Date(raceDate);
    if (isNaN(raceDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid race date' }, { status: 400 });
    }

    // Create profile (with authenticated client to respect RLS)
    const profile = await createProfile(
      {
        id: user.id,
        race_date: raceDateObj,
        fitness_level: fitnessLevel as FitnessLevel,
        target_hours_per_week: targetHours,
        weekday_time: weekdayTime,
        weekend_time: weekendTime,
        timezone,
      },
      supabase
    );

    // Calculate phases
    const phases = calculatePhases(raceDateObj);
    const trainingStart = getTrainingStartDate(raceDateObj);

    // Generate first 3 weeks of workouts
    const allWorkouts = [];
    for (let week = 1; week <= 3; week++) {
      const weekStart = getWeekStartDate(trainingStart, week, trainingStart);
      const weekWorkouts = generateWeekWorkouts(user.id, week, weekStart, profile, phases);
      allWorkouts.push(...weekWorkouts);
    }

    // Insert workouts into database (with authenticated client to respect RLS)
    const createdWorkouts = await createWorkouts(allWorkouts, 100, supabase);

    return NextResponse.json({
      success: true,
      profile,
      workoutsGenerated: createdWorkouts.length,
      message: 'Training plan created successfully',
    });
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
