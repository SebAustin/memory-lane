/**
 * PROTOTYPE, throwaway. Delete this whole `prototype/session-mode` folder once a variant wins.
 *
 * In-memory Session fixture for the demo Person "Margaret" (b. 1946, Memphis, middle stage).
 * Cue names are generic placeholders. There are no real images: each Cue gets a CSS-drawn picture.
 * Terms follow CONTEXT.md: Person, Caregiver, Cue, Prompt, Session, Kit, Reaction, Learned Favorite, Exclusion.
 */

export type Domain = "artist" | "film" | "tv" | "dish" | "brand";
export type ReactionKey = "engaged" | "neutral" | "distressed";

export interface Cue {
  readonly kind: "cue";
  readonly id: string;
  readonly domain: Domain;
  readonly name: string;
  readonly year: number;
  /** One short descriptor shown under the title. */
  readonly detail: string;
  readonly monogram: string;
  /** OKLCH hue used by the CSS-drawn placeholder picture. */
  readonly hue: number;
  /** Two open, failure-free Prompts. Each is 12 words or fewer (late-stage safe). */
  readonly prompts: readonly [string, string];
  /** Aggregate "Why this?" phrasing. Describes groups, never the Person. */
  readonly whyThis: string;
  /** Qloo affinity, 0 to 1. */
  readonly affinity: number;
  readonly signals: readonly string[];
  /** A Caregiver tip for the "For you" disclosure. */
  readonly tip: string;
}

export interface SensoryActivity {
  readonly kind: "sensory";
  readonly id: string;
  readonly title: string;
  readonly instruction: string;
  readonly materials: string;
  readonly monogram: string;
  readonly hue: number;
}

export type SessionItem = Cue | SensoryActivity;

export const PERSON = {
  name: "Margaret",
  born: 1946,
  hometown: "Memphis",
  stage: "Middle",
  window: "1956 to 1976",
} as const;

export const SESSION_META = {
  number: 1,
  title: "Saturday Night at the Pictures, 1962",
  minutes: 35,
} as const;

export const ITEMS: readonly SessionItem[] = [
  {
    kind: "cue",
    id: "cue-artist",
    domain: "artist",
    name: "The Delmar Sisters",
    year: 1958,
    detail: "Country harmony trio",
    monogram: "D",
    hue: 25,
    prompts: [
      "Tell me about the dances you went to.",
      "Tell me what a Saturday night sounded like at home.",
    ],
    whyThis: "People who share Margaret's era and favorites often loved this.",
    affinity: 0.91,
    signals: ["Age 55+", "Memphis", "1956-1976"],
    tip: "Let the song play through before you talk. Hum along if she does.",
  },
  {
    kind: "cue",
    id: "cue-film",
    domain: "film",
    name: "Moonlight on the Levee",
    year: 1961,
    detail: "Romantic drama",
    monogram: "M",
    hue: 255,
    prompts: [
      "Tell me about the picture shows you went to.",
      "Who did you like to go to the pictures with?",
    ],
    whyThis: "People from Memphis who share Margaret's era often loved this film.",
    affinity: 0.87,
    signals: ["Age 55+", "Memphis", "1956-1976"],
    tip: "A poster or a ticket stub on the table can help the conversation start.",
  },
  {
    kind: "cue",
    id: "cue-tv",
    domain: "tv",
    name: "The Hattie Larkin Show",
    year: 1959,
    detail: "Family variety hour",
    monogram: "H",
    hue: 150,
    prompts: [
      "Tell me about the family TV in your house.",
      "What did the room sound like when the show came on?",
    ],
    whyThis: "People who share Margaret's era and favorites often loved this.",
    affinity: 0.82,
    signals: ["Age 55+", "1956-1976"],
    tip: "Sit side by side and face the same way, as if watching together.",
  },
  {
    kind: "sensory",
    id: "sensory-hands",
    title: "Warm hands, soft cloth",
    instruction:
      "Warm a little hand cream between your palms, then offer a hand massage. Hum a Delmar Sisters tune if Margaret hums too.",
    materials: "Hand cream, a warm soft cloth",
    monogram: "~",
    hue: 195,
  },
  {
    kind: "cue",
    id: "cue-dish",
    domain: "dish",
    name: "Sunday Peach Cobbler",
    year: 1960,
    detail: "Southern supper dessert",
    monogram: "S",
    hue: 60,
    prompts: [
      "Tell me about Sunday dinners at your home.",
      "What smells take you back to your mother's kitchen?",
    ],
    whyThis: "People from Memphis who share Margaret's era often loved this dish.",
    affinity: 0.78,
    signals: ["Age 55+", "Memphis"],
    tip: "If you can, bring something warm that smells of peaches or cinnamon.",
  },
  {
    kind: "cue",
    id: "cue-brand",
    domain: "brand",
    name: "Evergreen Cream Soda",
    year: 1957,
    detail: "Soda fountain favorite",
    monogram: "E",
    hue: 175,
    prompts: [
      "Tell me about a treat you looked forward to.",
      "Where did you get a cold drink on a hot day?",
    ],
    whyThis: "People who share Margaret's era and favorites often loved this.",
    affinity: 0.74,
    signals: ["Age 55+", "1956-1976"],
    tip: "A paper straw or a cold glass makes the memory easier to reach.",
  },
];

/** Shown on the Pause screen: a calming Learned Favorite from an earlier Session. */
export const CALMING = {
  name: "The Delmar Sisters",
  monogram: "D",
  hue: 25,
  note: "Put on one slow song, quietly. Sit together. There is nothing to answer.",
} as const;

export const REACTION_ORDER: readonly ReactionKey[] = ["engaged", "neutral", "distressed"];

export const REACTIONS: Readonly<Record<ReactionKey, { label: string; plural: string }>> = {
  engaged: { label: "Engaged", plural: "Engaged" },
  neutral: { label: "Neutral", plural: "Neutral" },
  distressed: { label: "Distressed", plural: "Distressed" },
};

export const DOMAIN_LABEL: Readonly<Record<Domain, string>> = {
  artist: "Artist",
  film: "Film",
  tv: "TV show",
  dish: "Dish",
  brand: "Brand",
};

export const SAFETY_FULL =
  "Memory Lane suggests activities. It is not medical advice or therapy. Stop if Margaret seems upset, and talk to their care team about changes in mood or health.";

export function affinityBand(affinity: number): string {
  if (affinity >= 0.9) return "Very strong";
  if (affinity >= 0.8) return "Strong";
  if (affinity >= 0.7) return "Good";
  return "Moderate";
}

export function itemTitle(item: SessionItem): string {
  return item.kind === "cue" ? item.name : item.title;
}

export function itemKindLabel(item: SessionItem): string {
  return item.kind === "cue" ? DOMAIN_LABEL[item.domain] : "Sensory activity";
}

export const CUES: readonly Cue[] = ITEMS.filter((item): item is Cue => item.kind === "cue");
