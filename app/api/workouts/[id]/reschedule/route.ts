import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWorkout, updateWorkout } from '@/lib/supabase/queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workoutId = params.id;
    const body = await request.json();
    const { scheduled_date, scheduled_time } = body;

    if (!scheduled_date || !scheduled_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const workout = await getWorkout(workoutId);

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedWorkout = await updateWorkout(workoutId, {
      scheduled_date: new Date(scheduled_date),
      scheduled_time,
    });

    return NextResponse.json({ workout: updatedWorkout });
  } catch (error: any) {
    console.error('Error rescheduling workout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
