import { MINIMUM_TRAINING_WEEKS, PHASE_DISTRIBUTION } from './constants';
import type { Phase } from '@/types/database';

export interface PhaseBreakdown {
  totalWeeks: number;
  baseWeeks: number;
  buildWeeks: number;
  peakWeeks: number;
  taperWeeks: number;
}

export function calculatePhases(raceDate: Date): PhaseBreakdown {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  const raceDateNormalized = new Date(raceDate);
  raceDateNormalized.setHours(0, 0, 0, 0);

  const totalWeeks = Math.floor(
    (raceDateNormalized.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  if (totalWeeks < MINIMUM_TRAINING_WEEKS) {
    throw new Error(
      `Need at least ${MINIMUM_TRAINING_WEEKS} weeks to train for an Ironman. You have ${totalWeeks} weeks.`
    );
  }

  const baseWeeks = Math.floor(totalWeeks * PHASE_DISTRIBUTION.base);
  const buildWeeks = Math.floor(totalWeeks * PHASE_DISTRIBUTION.build);
  const peakWeeks = Math.floor(totalWeeks * PHASE_DISTRIBUTION.peak);
  const taperWeeks = Math.ceil(totalWeeks * PHASE_DISTRIBUTION.taper);

  return {
    totalWeeks,
    baseWeeks,
    buildWeeks,
    peakWeeks,
    taperWeeks,
  };
}

export function getPhaseForWeek(weekNumber: number, phases: PhaseBreakdown): Phase {
  if (weekNumber <= phases.baseWeeks) return 'base';
  if (weekNumber <= phases.baseWeeks + phases.buildWeeks) return 'build';
  if (weekNumber <= phases.baseWeeks + phases.buildWeeks + phases.peakWeeks) return 'peak';
  return 'taper';
}

export function getCurrentWeekNumber(raceDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raceDateNormalized = new Date(raceDate);
  raceDateNormalized.setHours(0, 0, 0, 0);

  const phases = calculatePhases(raceDateNormalized);
  const trainingStartDate = new Date(raceDateNormalized);
  trainingStartDate.setDate(trainingStartDate.getDate() - phases.totalWeeks * 7);

  const weeksSinceStart = Math.floor(
    (today.getTime() - trainingStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  return Math.max(1, weeksSinceStart + 1);
}

export function getTrainingStartDate(raceDate: Date): Date {
  const raceDateNormalized = new Date(raceDate);
  raceDateNormalized.setHours(0, 0, 0, 0);

  const phases = calculatePhases(raceDateNormalized);
  const startDate = new Date(raceDateNormalized);
  startDate.setDate(startDate.getDate() - phases.totalWeeks * 7);

  return startDate;
}
