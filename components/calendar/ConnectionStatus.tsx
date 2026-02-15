'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface ConnectionStatusProps {
  integration: {
    is_active: boolean;
    last_sync_status: string | null;
    last_sync_error: string | null;
    calendar_id: string | null;
    last_sync_at: string | null;
  } | null;
  variant?: 'compact' | 'detailed';
  className?: string;
  showLink?: boolean;
}

export default function ConnectionStatus({
  integration,
  variant = 'compact',
  className = '',
  showLink = false,
}: ConnectionStatusProps) {
  // Determine connection state
  const isConnected = integration?.is_active ?? false;
  const hasError =
    integration?.last_sync_status === 'error' ||
    integration?.last_sync_status === 'needs_reconnection';
  const calendarName = integration?.calendar_id || 'Unknown Calendar';

  // Compact variant for dashboard header
  if (variant === 'compact') {
    let icon;
    let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    let text;
    let iconColor = 'text-muted-foreground';

    if (isConnected && hasError) {
      icon = <AlertCircle className="w-4 h-4" />;
      badgeVariant = 'destructive';
      text = 'Calendar Error';
      iconColor = 'text-amber-600 dark:text-amber-500';
    } else if (isConnected) {
      icon = <CheckCircle2 className="w-4 h-4" />;
      badgeVariant = 'default';
      text = 'Calendar Connected';
      iconColor = 'text-green-600 dark:text-green-500';
    } else {
      icon = <Calendar className="w-4 h-4" />;
      badgeVariant = 'outline';
      text = 'Not Connected';
      iconColor = 'text-muted-foreground';
    }

    const content = (
      <Badge variant={badgeVariant} className={`${className} flex items-center gap-1.5`}>
        <span className={iconColor}>{icon}</span>
        <span>{text}</span>
      </Badge>
    );

    if (showLink) {
      return (
        <Link href="/settings/calendar" className="hover:opacity-80 transition-opacity">
          {content}
        </Link>
      );
    }

    return content;
  }

  // Detailed variant for settings page
  if (variant === 'detailed') {
    if (!isConnected) {
      return (
        <div className={`flex items-start gap-3 ${className}`}>
          <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-muted-foreground">Not Connected</p>
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to sync workouts automatically
            </p>
          </div>
        </div>
      );
    }

    if (hasError) {
      const errorMessage =
        integration.last_sync_error || 'Unable to sync with Google Calendar. Please reconnect.';

      return (
        <div className={`flex items-start gap-3 ${className}`}>
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-600 dark:text-amber-500">Connection Error</p>
            <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            {integration.calendar_id && (
              <p className="text-sm text-muted-foreground mt-1">
                Calendar: <span className="font-mono">{integration.calendar_id}</span>
              </p>
            )}
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-2">
              Please reconnect your calendar to restore sync.
            </p>
          </div>
        </div>
      );
    }

    // Connected and healthy
    const lastSyncDate = integration?.last_sync_at
      ? new Date(integration.last_sync_at).toLocaleString()
      : 'Never';

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-green-600 dark:text-green-500">Connected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Calendar: <span className="font-mono">{calendarName}</span>
          </p>
          <p className="text-sm text-muted-foreground">Last sync: {lastSyncDate}</p>
        </div>
      </div>
    );
  }

  return null;
}
