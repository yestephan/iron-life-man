import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { getWorkout, updateWorkout } from '@/lib/supabase/queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await getSupabaseClient();

    const { id: workoutId } = await params;
    const body = await request.json();
    const { scheduled_date, scheduled_time } = body;

    if (!scheduled_date || !scheduled_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const workout = await getWorkout(workoutId, supabase);

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedWorkout = await updateWorkout(
      workoutId,
      {
        scheduled_date: new Date(scheduled_date),
        scheduled_time,
      },
      supabase
    );

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error: any) {
    console.error('Error rescheduling workout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
