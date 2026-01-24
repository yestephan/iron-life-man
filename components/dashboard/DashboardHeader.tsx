import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, Calendar } from 'lucide-react';
import type { Phase } from '@/types/database';

interface DashboardHeaderProps {
  currentWeek: number;
  totalWeeks: number;
  phase: Phase;
  raceDate: Date;
}

export default function DashboardHeader({
  currentWeek,
  totalWeeks,
  phase,
  raceDate,
}: DashboardHeaderProps) {
  const phaseLabels = {
    base: 'Base Phase',
    build: 'Build Phase',
    peak: 'Peak Phase',
    taper: 'Taper Phase',
  };

  const phaseColors = {
    base: 'bg-blue-500',
    build: 'bg-green-500',
    peak: 'bg-orange-500',
    taper: 'bg-purple-500',
  };

  const daysUntilRace = Math.ceil(
    (raceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold">Training Dashboard</h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-muted-foreground">
            Week {currentWeek} of {totalWeeks}
          </p>
          <Badge className={phaseColors[phase]}>
            {phaseLabels[phase]}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {daysUntilRace} days until race day
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}
