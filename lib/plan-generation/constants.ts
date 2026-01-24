// Plan generation constants

export const DISCIPLINE_RATIOS = {
  swim: 0.18, // 18% of total weekly volume
  bike: 0.52, // 52% of total weekly volume
  run: 0.3, // 30% of total weekly volume
} as const;

export const FITNESS_MULTIPLIERS = {
  beginner: 0.6, // Start at 60% of target volume
  intermediate: 0.7, // Start at 70% of target volume
  advanced: 0.8, // Start at 80% of target volume
} as const;

export const PHASE_DISTRIBUTION = {
  base: 0.4, // First 40% of weeks
  build: 0.35, // Next 35% of weeks
  peak: 0.2, // Next 20% of weeks
  taper: 0.05, // Final 5% of weeks
} as const;

export const MINIMUM_TRAINING_WEEKS = 12;

// Weekly workout distribution
export const WEEKLY_TEMPLATE = {
  swim: [
    { day: 'tuesday', type: 'easy' as const, volumePct: 0.4 },
    { day: 'thursday', type: 'intervals' as const, volumePct: 0.6 },
  ],
  bike: [
    { day: 'monday', type: 'easy' as const, volumePct: 0.25 },
    { day: 'wednesday', type: 'tempo' as const, volumePct: 0.3 },
    { day: 'saturday', type: 'long' as const, volumePct: 0.45 },
  ],
  run: [
    { day: 'tuesday', type: 'easy' as const, volumePct: 0.35 },
    { day: 'thursday', type: 'intervals' as const, volumePct: 0.3 },
    { day: 'sunday', type: 'long' as const, volumePct: 0.35 },
  ],
} as const;
