'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function AvailabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [targetHours, setTargetHours] = useState(10);
  const [weekdayTime, setWeekdayTime] = useState('06:00');
  const [weekendTime, setWeekendTime] = useState('08:00');
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    // Detect user timezone
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (targetHours < 6 || targetHours > 20) {
      toast({
        title: 'Error',
        description: 'Training hours must be between 6 and 20 per week',
        variant: 'destructive',
      });
      return;
    }

    // Get previous data and add new data
    const params = new URLSearchParams(searchParams.toString());
    params.set('targetHours', targetHours.toString());
    params.set('weekdayTime', weekdayTime);
    params.set('weekendTime', weekendTime);
    params.set('timezone', timezone);

    router.push(`/onboarding/generating?${params.toString()}`);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Training Availability</CardTitle>
          <CardDescription>
            When can you train? We'll schedule workouts at these times
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Target Hours */}
            <div className="space-y-3">
              <Label htmlFor="targetHours">
                Target Training Hours Per Week: <strong>{targetHours} hours</strong>
              </Label>
              <Input
                id="targetHours"
                type="range"
                min="6"
                max="20"
                step="1"
                value={targetHours}
                onChange={(e) => setTargetHours(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>6 hours</span>
                <span>20 hours</span>
              </div>
            </div>

            {/* Weekday Training Time */}
            <div className="space-y-2">
              <Label htmlFor="weekdayTime">Weekday Training Time</Label>
              <Input
                id="weekdayTime"
                type="time"
                value={weekdayTime}
                onChange={(e) => setWeekdayTime(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Monday-Friday workouts will be scheduled at this time
              </p>
            </div>

            {/* Weekend Training Time */}
            <div className="space-y-2">
              <Label htmlFor="weekendTime">Weekend Training Time</Label>
              <Input
                id="weekendTime"
                type="time"
                value={weekendTime}
                onChange={(e) => setWeekendTime(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Saturday-Sunday workouts will be scheduled at this time
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Auto-detected. Update if incorrect.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
