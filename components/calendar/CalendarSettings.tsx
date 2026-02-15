'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConnectionStatus from '@/components/calendar/ConnectionStatus';
import { deleteGoogleTokens } from '@/app/actions/calendar/tokens';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

interface CalendarSettingsProps {
  userId: string;
  integration: {
    id: string;
    is_active: boolean;
    last_sync_status: string | null;
    last_sync_error: string | null;
    calendar_id: string | null;
    last_sync_at: string | null;
  } | null;
}

export default function CalendarSettings({ userId, integration }: CalendarSettingsProps) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const isConnected = integration?.is_active ?? false;

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      // Delete tokens
      await deleteGoogleTokens(userId);

      // Close dialog and refresh page to show updated status
      setShowDisconnectDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
      alert('Failed to disconnect. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Your Google Calendar connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectionStatus integration={integration} variant="detailed" />
        </CardContent>
      </Card>

      {/* Connect/Reconnect Section */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Google Calendar</CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically sync your training workouts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>When you connect Google Calendar, you will be able to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>View your training workouts in Google Calendar</li>
                <li>See work meeting conflicts with training time</li>
                <li>Automatically sync workout changes</li>
                <li>Select which calendar to use for workouts</li>
              </ul>
            </div>
            <a href="/api/auth/google/authorize?redirect=/settings/calendar">
              <Button variant="default">Connect Google Calendar</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Connected Calendar Details */}
      {isConnected && integration?.calendar_id && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Calendar</CardTitle>
            <CardDescription>Calendar used for workout syncing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Calendar ID:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                {integration.calendar_id}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Calendar Section */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Change Calendar</CardTitle>
            <CardDescription>Select a different Google Calendar for workout syncing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Coming soon: You will be able to select which calendar to use for workouts.
            </p>
            <Button variant="secondary" disabled>
              Change Calendar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Section */}
      {isConnected && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Disconnect Google Calendar</CardTitle>
            <CardDescription>
              Remove the connection between Iron Life Man and your Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-md">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-medium text-destructive">Warning: Disconnecting will:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                  <li>Stop syncing new workouts to Google Calendar</li>
                  <li>Stop syncing workout changes and updates</li>
                  <li>Keep existing calendar events (they will not be deleted)</li>
                </ul>
                <p className="text-muted-foreground">
                  You can reconnect anytime to resume syncing.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDisconnectDialog(true)}
            >
              Disconnect Google Calendar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Google Calendar?</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Your workouts will stop syncing to Google Calendar. Existing events in your
                calendar will not be removed.
              </p>
              <p className="font-medium">You can reconnect anytime.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
