import { FITNESS_MULTIPLIERS } from './constants';
import type { Phase, FitnessLevel } from '@/types/database';
import type { PhaseBreakdown } from './phases';

export function calculateWeeklyVolume(
  weekNumber: number,
  phase: Phase,
  targetHours: number,
  fitnessLevel: FitnessLevel,
  phases: PhaseBreakdown
): number {
  const baseMultiplier = FITNESS_MULTIPLIERS[fitnessLevel];
  let phaseMultiplier: number;

  switch (phase) {
    case 'base': {
      // Ramp from 60% to 80% of target over base phase
      const progressPct = Math.max(0, Math.min(1, (weekNumber - 1) / Math.max(1, phases.baseWeeks)));
      phaseMultiplier = 0.6 + progressPct * 0.2;
      break;
    }
    case 'build': {
      // Ramp from 80% to 100% over build phase
      const weekInPhase = weekNumber - phases.baseWeeks;
      const progressPct = Math.max(0, Math.min(1, (weekInPhase - 1) / Math.max(1, phases.buildWeeks)));
      phaseMultiplier = 0.8 + progressPct * 0.2;
      break;
    }
    case 'peak': {
      // Hold at 100-110% over peak phase
      const weekInPhase = weekNumber - phases.baseWeeks - phases.buildWeeks;
      const progressPct = Math.max(0, Math.min(1, (weekInPhase - 1) / Math.max(1, phases.peakWeeks)));
      phaseMultiplier = 1.0 + Math.min(progressPct, 0.1);
      break;
    }
    case 'taper': {
      // Drop from 100% to 40% over taper
      const weekInPhase = weekNumber - phases.baseWeeks - phases.buildWeeks - phases.peakWeeks;
      const progressPct = Math.max(0, Math.min(1, (weekInPhase - 1) / Math.max(1, phases.taperWeeks)));
      phaseMultiplier = 1.0 - progressPct * 0.6;
      break;
    }
  }

  return targetHours * baseMultiplier * phaseMultiplier;
}
