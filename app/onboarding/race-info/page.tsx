'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { FitnessLevel } from '@/types/database';

export default function RaceInfoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [raceDate, setRaceDate] = useState<Date | undefined>(undefined);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!raceDate) {
      toast({
        title: 'Error',
        description: 'Please select a race date',
        variant: 'destructive',
      });
      return;
    }

    // Validate race date is at least 12 weeks away
    const today = new Date();
    const weeksAway = Math.floor(
      (raceDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    if (weeksAway < 12) {
      toast({
        title: 'Error',
        description: `Your race must be at least 12 weeks away. You have ${weeksAway} weeks.`,
        variant: 'destructive',
      });
      return;
    }

    // Navigate to next step with data
    const params = new URLSearchParams();
    params.set('raceDate', format(raceDate, 'yyyy-MM-dd'));
    params.set('fitnessLevel', fitnessLevel);
    router.push(`/onboarding/availability?${params.toString()}`);
  };

  // Calculate minimum date (12 weeks from today)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 12 * 7);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Race Information</CardTitle>
          <CardDescription>Tell us about your upcoming Ironman</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Race Date */}
            <div className="space-y-2">
              <Label>Race Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!raceDate}
                    className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {raceDate ? format(raceDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={raceDate}
                    onSelect={setRaceDate}
                    disabled={(date) => date < minDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">Must be at least 12 weeks from today</p>
            </div>

            {/* Fitness Level */}
            <div className="space-y-3">
              <Label>Fitness Level</Label>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setFitnessLevel('beginner')}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    fitnessLevel === 'beginner'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">Beginner</div>
                      <p className="text-sm text-muted-foreground">
                        New to endurance training or first Ironman
                      </p>
                    </div>
                    {fitnessLevel === 'beginner' && <Badge variant="default">Selected</Badge>}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFitnessLevel('intermediate')}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    fitnessLevel === 'intermediate'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">Intermediate</div>
                      <p className="text-sm text-muted-foreground">
                        Completed marathons or half-Ironman
                      </p>
                    </div>
                    {fitnessLevel === 'intermediate' && <Badge variant="default">Selected</Badge>}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFitnessLevel('advanced')}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    fitnessLevel === 'advanced'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">Advanced</div>
                      <p className="text-sm text-muted-foreground">
                        Multiple Ironman finishes, consistent training background
                      </p>
                    </div>
                    {fitnessLevel === 'advanced' && <Badge variant="default">Selected</Badge>}
                  </div>
                </button>
              </div>
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
