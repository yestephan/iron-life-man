'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <h1 className="text-5xl font-bold mb-2">🏊🚴🏃</h1>
          </div>
          <CardTitle className="text-4xl">Welcome to Iron Life Man</CardTitle>
          <CardDescription className="text-lg">
            Your personalized Ironman training journey starts here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              We'll create a customized 16-week training plan tailored to your fitness level and schedule,
              then sync it directly to your calendar.
            </p>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="space-y-2">
                <div className="text-2xl">📅</div>
                <h3 className="font-semibold">Synced to Calendar</h3>
                <p className="text-muted-foreground">
                  See your training in your actual calendar
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">📈</div>
                <h3 className="font-semibold">Progressive Training</h3>
                <p className="text-muted-foreground">
                  Build through base, build, peak, and taper phases
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">⚡</div>
                <h3 className="font-semibold">Personalized</h3>
                <p className="text-muted-foreground">
                  Adapted to your fitness level and time
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <Button
              onClick={() => router.push('/onboarding/race-info')}
              size="lg"
              className="w-full"
            >
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
