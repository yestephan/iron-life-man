'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Zap } from 'lucide-react';

export default function GeneratingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Creating your profile...');

  useEffect(() => {
    const generatePlan = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          router.push('/signin');
          return;
        }

        // Simulate progress
        setProgress(20);
        setStatus('Creating your profile...');

        const onboardingData = {
          raceDate: searchParams.get('raceDate'),
          fitnessLevel: searchParams.get('fitnessLevel'),
          targetHours: parseInt(searchParams.get('targetHours') || '10'),
          weekdayTime: searchParams.get('weekdayTime'),
          weekendTime: searchParams.get('weekendTime'),
          timezone: searchParams.get('timezone'),
        };

        setProgress(40);
        setStatus('Calculating training phases...');

        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onboardingData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to generate plan');
        }

        const result = await response.json();
        
        // Verify profile was created successfully
        if (!result.success) {
          throw new Error('Failed to create profile');
        }

        setProgress(60);
        setStatus('Generating your first 3 weeks...');

        await new Promise((resolve) => setTimeout(resolve, 1000));
        setProgress(80);

        setStatus('Finalizing your training plan...');
        await new Promise((resolve) => setTimeout(resolve, 500));
        setProgress(100);

        toast({
          title: 'Success',
          description: 'Your training plan is ready!',
        });

        // Wait a moment to ensure database write has fully propagated
        // Then redirect using replace to avoid history issues
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        // Force a full page navigation to ensure server-side checks see the new profile
        window.location.replace('/dashboard');
      } catch (error: any) {
        console.error('Error generating plan:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to generate your plan. Please try again.',
          variant: 'destructive',
        });
        setTimeout(() => {
          router.push('/onboarding/availability?' + searchParams.toString());
        }, 2000);
      }
    };

    generatePlan();
  }, [searchParams, router, toast]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Zap className="w-16 h-16 text-primary" />
          </div>
          <CardTitle>Generating Your Training Plan</CardTitle>
          <CardDescription>This will only take a moment...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-center text-muted-foreground">{status}</p>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Creating {searchParams.get('fitnessLevel')} level plan</p>
            <p>{searchParams.get('targetHours')} hours per week</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
