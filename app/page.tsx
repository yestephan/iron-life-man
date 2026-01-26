import { redirect } from 'next/navigation';
import { getUser, getSupabaseClient } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/supabase/queries';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Home() {
  const user = await getUser();

  if (user) {
    // Check if user has completed onboarding
    const supabase = await getSupabaseClient();
    const profile = await getProfile(user.id, supabase);

    if (!profile) {
      redirect('/onboarding');
    }

    redirect('/dashboard');
  }

  // Show landing page for unauthenticated users
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">🏊🚴🏃</div>
            <span className="text-xl font-bold">Iron Life Man</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/signin">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
              Your Personalized
              <span className="text-primary"> Ironman Training</span> Plan
            </h1>
            <p className="mb-8 text-xl text-muted-foreground sm:text-2xl">
              Generate a custom 16-week training plan tailored to your fitness level, schedule, and
              race goals. Sync directly to your calendar.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Training Plan
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Everything You Need to Succeed</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>📅 Personalized Plans</CardTitle>
                  <CardDescription>
                    Get a custom 16-week training plan based on your fitness level, race date, and
                    availability
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>📊 Progress Tracking</CardTitle>
                  <CardDescription>
                    Monitor your training volume across swim, bike, and run disciplines with visual
                    progress indicators
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>🔄 Flexible Scheduling</CardTitle>
                  <CardDescription>
                    Reschedule workouts, mark them complete, or skip when needed. Your plan adapts
                    to your life
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>📈 Progressive Training</CardTitle>
                  <CardDescription>
                    Follow a structured progression through base, build, peak, and taper phases
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>⏰ Smart Scheduling</CardTitle>
                  <CardDescription>
                    Set your preferred workout times and availability. We'll optimize your training
                    schedule
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Race-Ready</CardTitle>
                  <CardDescription>
                    Build up to peak performance with a taper phase designed to have you ready on
                    race day
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Start Your Journey?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join athletes training for their Ironman race. Get your personalized plan in minutes.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign In to Existing Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ for Ironman athletes</p>
        </div>
      </footer>
    </div>
  );
}
