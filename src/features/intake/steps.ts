/** The six steps of the Life Story wizard (UX section 3). */
export const STEP_COUNT = 6;

export interface StepInfo {
  readonly n: number;
  /** Short name for the stepper. */
  readonly label: string;
  /** The page heading. The only `h1` on the route. */
  readonly heading: string;
  /** One calm line under the heading. */
  readonly lede: string;
  /** Optional steps get a Skip button (FR-3). */
  readonly optional: boolean;
}

export const STEPS: readonly StepInfo[] = [
  {
    n: 1,
    label: "About them",
    heading: "Tell us about them",
    lede: "A first name and the year they were born. That is all we need to start.",
    optional: false,
  },
  {
    n: 2,
    label: "Places",
    heading: "The places that shaped them",
    lede: "Where someone grew up is one of the strongest clues to the music and films they loved.",
    optional: false,
  },
  {
    n: 3,
    label: "Roots",
    heading: "Where their family comes from",
    lede: "Heritage, language and work add colour to the Sessions. Skip any of it you are unsure about.",
    optional: true,
  },
  {
    n: 4,
    label: "Seeds",
    heading: "A few favorites to start from",
    lede: "Songs, films, shows or places they loved. We match each one to the real thing.",
    optional: false,
  },
  {
    n: 5,
    label: "Avoid List",
    heading: "Things to keep away",
    lede: "Anything that might upset them. It is left out of every Kit.",
    optional: true,
  },
  {
    n: 6,
    label: "Stage and review",
    heading: "Stage and review",
    lede: "Check what you have told us, then build the Kit.",
    optional: false,
  },
];

export const stepInfo = (n: number): StepInfo => STEPS[n - 1] ?? STEPS[0]!;
