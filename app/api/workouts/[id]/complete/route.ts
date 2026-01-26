import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth';
import { getWorkout, updateWorkout } from '@/lib/supabase/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = await getSupabaseClient();

    const workoutId = params.id;
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
        status: 'completed',
        completed_at: new Date(),
      },
      supabase
    );

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error: any) {
    console.error('Error completing workout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
