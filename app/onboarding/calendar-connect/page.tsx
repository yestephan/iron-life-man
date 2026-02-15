'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CalendarPlus, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import {
  listWritableCalendars,
  createIronLifeManCalendar,
  selectCalendar,
} from '@/app/actions/calendar/calendars';
import { createClient } from '@/lib/supabase/client';

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

export default function CalendarConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<'connect' | 'select'>('connect');
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Determine initial step and handle errors
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const errorParam = searchParams.get('error');
    const skippedParam = searchParams.get('skipped');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_state: 'Security validation failed. Please try connecting again.',
        token_exchange: 'Failed to complete authorization. Please try again.',
        missing_code: 'Authorization was incomplete. Please try again.',
      };
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.');
      setStep('connect');
    } else if (stepParam === 'select') {
      setStep('select');
    } else if (skippedParam === 'true') {
      // Show brief message then redirect to generating
      setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('skipped');
        router.push(`/onboarding/generating?${params.toString()}`);
      }, 1500);
    }
  }, [searchParams, router]);

  // Load calendars when in select step
  useEffect(() => {
    if (step === 'select' && userId && calendars.length === 0) {
      loadCalendars();
    }
  }, [step, userId]);

  const loadCalendars = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedCalendars = await listWritableCalendars(userId);
      setCalendars(fetchedCalendars);

      // Auto-select primary calendar if available
      const primaryCalendar = fetchedCalendars.find((cal) => cal.primary);
      if (primaryCalendar) {
        setSelectedCalendarId(primaryCalendar.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load calendars. Please try again.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load calendars',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCalendar = async () => {
    if (!userId) return;

    setIsCreating(true);
    setError(null);

    try {
      const newCalendar = await createIronLifeManCalendar(userId);

      // Add new calendar to list and select it
      const updatedCalendars = [
        ...calendars,
        { id: newCalendar.id, summary: newCalendar.summary, primary: false },
      ];
      setCalendars(updatedCalendars);
      setSelectedCalendarId(newCalendar.id);

      toast({
        title: 'Success',
        description: 'Iron Life Man calendar created successfully!',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create calendar. Please try again.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create calendar',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleContinue = async () => {
    if (!userId || !selectedCalendarId) return;

    setIsLoading(true);
    setError(null);

    try {
      await selectCalendar(userId, selectedCalendarId);

      // Navigate to generating with all onboarding params
      const params = new URLSearchParams(searchParams.toString());
      params.delete('step');
      params.delete('error');
      router.push(`/onboarding/generating?${params.toString()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save calendar selection. Please try again.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to save calendar selection',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Navigate to generating with all onboarding params
    const params = new URLSearchParams(searchParams.toString());
    params.delete('step');
    params.delete('error');
    params.delete('skipped');
    router.push(`/onboarding/generating?${params.toString()}`);
  };

  // Show brief skipped message
  if (searchParams.get('skipped') === 'true') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>No Problem!</CardTitle>
            <CardDescription>
              You can connect your calendar later from settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Step 1: Connect
  if (step === 'connect') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Connect Google Calendar</CardTitle>
            <CardDescription>
              Sync your workouts to Google Calendar automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What we'll access:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">View your calendar list</p>
                    <p className="text-sm text-muted-foreground">
                      See which calendars you have available
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarPlus className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Create and manage workout events</p>
                    <p className="text-sm text-muted-foreground">
                      Add your training schedule to your calendar
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Update events when your plan changes</p>
                    <p className="text-sm text-muted-foreground">
                      Keep your calendar in sync with plan adjustments
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  We'll only access your Google Calendar. No other data is read or stored.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
              >
                Skip for Now
              </Button>
              <Button asChild className="flex-1">
                <a href="/api/auth/google/authorize">Connect Google Calendar</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Select Calendar
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Choose Your Calendar</CardTitle>
          <CardDescription>Select where your workouts will appear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && calendars.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <Button
                  onClick={handleCreateCalendar}
                  disabled={isCreating}
                  variant="outline"
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="h-4 w-4" />
                      Create 'Iron Life Man' Calendar (Recommended)
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Or select an existing calendar</label>
                  <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.summary}
                          {calendar.primary && ' (Primary)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!selectedCalendarId || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
