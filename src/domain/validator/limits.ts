/**
 * Length limits of the Kit contract (`src/contracts/kit.ts`). A string over its
 * limit is replaced like a string that fails `checkText`, so a validated Kit
 * always parses. A test keeps these in step with the schema.
 */
export const LIMITS = {
  title: 60,
  theme: 120,
  prompt: 140,
  sensoryActivity: 200,
  caregiverTip: 160,
  whyThis: 160,
  sensoryMax: 3,
  caregiverTipsMax: 3,
  durationMin: { min: 20, max: 45 },
} as const;
