import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWorkout, updateWorkout } from '@/lib/supabase/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workoutId = params.id;
    const workout = await getWorkout(workoutId);

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedWorkout = await updateWorkout(workoutId, {
      status: 'skipped',
    });

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error: any) {
    console.error('Error skipping workout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
