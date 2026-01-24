'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Workout } from '@/types/database';
import { format } from 'date-fns';

interface RescheduleModalProps {
  workout: Workout;
  open: boolean;
  onClose: () => void;
}

export default function RescheduleModal({ workout, open, onClose }: RescheduleModalProps) {
  const [scheduledDate, setScheduledDate] = useState(
    format(new Date(workout.scheduled_date), 'yyyy-MM-dd')
  );
  const [scheduledTime, setScheduledTime] = useState(workout.scheduled_time);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/workouts/${workout.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule workout');
      }

      toast({
        title: 'Success',
        description: 'Workout rescheduled successfully',
      });

      onClose();
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reschedule workout',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Workout</DialogTitle>
          <DialogDescription>
            Choose a new date and time for this workout
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
