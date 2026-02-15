'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RescheduleModal from './RescheduleModal';
import type { Workout } from '@/types/database';

interface WorkoutActionsProps {
  workout: Workout;
}

export default function WorkoutActions({ workout }: WorkoutActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workouts/${workout.id}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark workout as complete');
      }

      toast({
        title: 'Success',
        description: 'Workout marked as complete!',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark workout as complete',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workouts/${workout.id}/skip`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to skip workout');
      }

      toast({
        title: 'Workout skipped',
        description: 'Workout marked as skipped',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to skip workout',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (workout.status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4" />
        <span>Completed</span>
      </div>
    );
  }

  if (workout.status === 'skipped') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <X className="w-4 h-4" />
        <span>Skipped</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleComplete} disabled={isLoading}>
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Complete
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowReschedule(true)}
          disabled={isLoading}
        >
          <Calendar className="w-4 h-4 mr-1" />
          Reschedule
        </Button>
        <Button size="sm" variant="ghost" onClick={handleSkip} disabled={isLoading}>
          Skip
        </Button>
      </div>

      <RescheduleModal
        workout={workout}
        open={showReschedule}
        onClose={() => setShowReschedule(false)}
      />
    </>
  );
}
