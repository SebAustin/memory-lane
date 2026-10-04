/**
 * A deliberately rogue scenario for `validateKit` (EVALS d and g; ticket 10):
 * Margaret's run registry, her Taste Profile, and a model draft that breaks
 * every rule the validator guards. Shared by the unit tests and
 * `pnpm validate:demo`. Synthetic data only; ids are `fx-` fixture ids.
 */
import type { Domain, KitDraft, Stage } from "@/contracts";
import type { TemplateLibrary } from "@/domain/templateLibrary";
import { reminiscenceWindow } from "@/domain/window";
import type { RegistryEntry, ValidationContext } from "@/domain/validator/types";

const TAG_COUNTRY = { id: "tag-country", name: "country & western" };
const TAG_HEARTBREAK = { id: "tag-heartbreak", name: "heartbreak" };

function entry(
  entityId: string,
  domain: Domain,
  name: string,
  affinity: number,
  year?: number,
  tags: RegistryEntry["tags"] = [],
): RegistryEntry {
  return { entityId, domain, name, affinity, tags, ...(year === undefined ? {} : { year }) };
}

/** Margaret (born 1946): original Window 1956 to 1976. */
export const ROGUE_REGISTRY: readonly RegistryEntry[] = [
  entry("fx-music-patsy-cline", "music", "Patsy Cline", 0.95, undefined, [TAG_COUNTRY]),
  entry("fx-music-loretta-lynn", "music", "Loretta Lynn", 0.9, undefined, [TAG_COUNTRY]),
  entry("fx-music-dolly-parton", "music", "Dolly Parton", 0.88, undefined, [TAG_COUNTRY]),
  entry("fx-music-brenda-lee", "music", "Brenda Lee", 0.84),
  entry("fx-music-jim-reeves", "music", "Jim Reeves", 0.8, undefined, [TAG_COUNTRY]),
  entry("fx-music-elvis-presley", "music", "Elvis Presley", 0.97),
  entry("fx-music-ray-price", "music", "Ray Price", 0.7, undefined, [TAG_HEARTBREAK]),
  entry("fx-music-tammy-wynette", "music", "Tammy Wynette", 0.74, undefined, [TAG_COUNTRY]),
  entry("fx-music-kitty-wells", "music", "Kitty Wells", 0.66, undefined, [TAG_COUNTRY]),
  entry("fx-film-pillow-talk", "film", "Pillow Talk", 0.9, 1959),
  entry("fx-film-move-over-darling", "film", "Move Over, Darling", 0.86, 1963),
  entry("fx-film-breakfast-at-tiffanys", "film", "Breakfast at Tiffany's", 0.85, 1961),
  entry("fx-film-the-sound-of-music", "film", "The Sound of Music", 0.8, 1965),
  entry("fx-film-mary-poppins", "film", "Mary Poppins", 0.78, 1964),
  entry("fx-film-blue-hawaii", "film", "Blue Hawaii", 0.75, 1961),
  entry("fx-film-rear-window", "film", "Rear Window", 0.72, 1954),
  entry("fx-film-some-like-it-hot", "film", "Some Like It Hot", 0.7, 1959),
  entry("fx-film-west-side-story", "film", "West Side Story", 0.68, 1961),
  entry("fx-film-gone-with-the-wind", "film", "Gone with the Wind", 0.7, 1939),
  entry("fx-film-titanic", "film", "Titanic", 0.5, 1997),
  entry("fx-film-mystery-reel", "film", "Mystery Reel", 0.6),
  entry("fx-tv-andy-griffith", "tv", "The Andy Griffith Show", 0.82, 1960),
  entry("fx-tv-bonanza", "tv", "Bonanza", 0.7, 1959),
  entry("fx-tv-gunsmoke", "tv", "Gunsmoke", 0.68, 1955),
  entry("fx-tv-perry-mason", "tv", "Perry Mason", 0.64, 1957),
  entry("fx-tv-mister-ed", "tv", "Mister Ed", 0.5, 1961),
  entry("fx-tv-i-love-lucy", "tv", "I Love Lucy", 0.66, 1951),
  entry("fx-tv-general-hospital", "tv", "General Hospital", 0.6, 1963),
  entry("fx-book-mockingbird", "book", "To Kill a Mockingbird", 0.8, 1960),
  entry("fx-book-peyton-place", "book", "Peyton Place", 0.7, 1956),
  entry("fx-book-war-diaries", "book", "The Great War Diaries", 0.65, 1962),
  entry("fx-book-undated", "book", "A Book Without a Year", 0.5),
  entry("fx-place-gus", "place", "Gus's World Famous Fried Chicken", 0.7),
  entry("fx-place-peabody", "place", "The Peabody Hotel", 0.75),
  entry("fx-place-beale-street", "place", "Beale Street", 0.6),
  entry("fx-brand-coca-cola", "brand", "Coca-Cola", 0.8),
  entry("fx-brand-sears", "brand", "Sears", 0.7),
];

/** The validation context for the rogue scenario. `stage` is set per scenario. */
export function rogueContext(templates: TemplateLibrary, stage: Stage = "late"): ValidationContext {
  return {
    registry: ROGUE_REGISTRY,
    stage,
    window: reminiscenceWindow(1946),
    widened: [],
    profile: {
      seeds: [
        { entityId: "fx-music-patsy-cline", name: "Patsy Cline" },
        { entityId: "fx-film-pillow-talk", name: "Pillow Talk" },
        { entityId: "fx-film-move-over-darling", name: "Move Over, Darling" },
      ],
      learnedFavorites: [],
      exclusions: [
        {
          kind: "entity",
          id: "fx-music-elvis-presley",
          label: "Elvis Presley",
          source: "reaction",
          addedAt: "2026-10-01T10:00:00.000Z",
        },
        {
          kind: "tag",
          id: "tag-heartbreak",
          label: "heartbreak",
          source: "reaction",
          addedAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      avoidTopics: ["Vietnam War", "Tennessee Waltz", "hospitals"],
    },
    sensitiveThemesOptIn: false,
    fingerprintTagNames: ["country & western", "classic Hollywood"],
    places: ["Memphis"],
    previousCueIds: [],
    templates,
  };
}

/**
 * What a misbehaving model might return. Every problem is listed here, with
 * the reason `validateKit` should give for it:
 * - session 1: an invented id, an excluded id, an out-of-Window film, a film
 *   with no year, a Seed echoed as a Cue, a duplicate Cue, a quiz Prompt, a
 *   conversation format with too many Prompts and no sensory activity;
 * - session 2: an Avoid term and a claim word in the headings, "improves
 *   memory" in a tip, "Tennessee Waltz" in a Prompt, an invented Title-Case
 *   name in `whyThis`, a quoted invented title in a theme;
 * - session 3: too few Cues once the rogue ones are gone (backfill), a Cue
 *   named after a war and one of the Avoid List's "hospitals".
 * The UX titles "Saturday Night at the Pictures, 1962" and a quoted real Cue
 * name are fine and must survive untouched.
 */
export const ROGUE_DRAFT: KitDraft = {
  sessions: [
    {
      title: "Saturday Night at the Pictures, 1962",
      theme: "Dressing up for a night out at the cinema",
      format: "conversation",
      durationMin: 90,
      sensoryActivities: [],
      caregiverTips: ["Let {name} set the pace and sit side by side."],
      cues: [
        {
          entity_id: "fx-film-breakfast-at-tiffanys",
          domain: "film",
          whyThis: "People who share your era and love classic films tend to love this one.",
          prompts: [
            "Do you remember who starred in this one?",
            "Tell me about going to the pictures on a Saturday night.",
            "What did you wear to the pictures?",
          ],
        },
        {
          entity_id: "fx-film-invented-by-the-model",
          domain: "film",
          whyThis: "A made-up film.",
          prompts: ["Tell me about this film."],
        },
        {
          entity_id: "fx-music-elvis-presley",
          domain: "music",
          whyThis: "An excluded artist.",
          prompts: ["Tell me about this music."],
        },
        {
          entity_id: "fx-film-gone-with-the-wind",
          domain: "film",
          whyThis: "A film from before the Window.",
          prompts: ["Tell me about this film."],
        },
        {
          entity_id: "fx-film-mystery-reel",
          domain: "film",
          whyThis: "A film with no year.",
          prompts: ["Tell me about this film."],
        },
        {
          entity_id: "fx-music-patsy-cline",
          domain: "music",
          whyThis: "A Seed echoed back.",
          prompts: ["Tell me about this music."],
        },
        {
          entity_id: "fx-music-loretta-lynn",
          domain: "music",
          whyThis: "Many people who grew up in the South loved her songs.",
          prompts: ["Tell me about a song you used to sing along to."],
        },
        {
          entity_id: "fx-film-breakfast-at-tiffanys",
          domain: "film",
          whyThis: "A repeat of the first Cue.",
          prompts: ["Tell me about this film."],
        },
      ],
    },
    {
      title: "Healing Songs of Memphis",
      theme: 'An evening with "The Velvet Hour"',
      format: "conversation",
      durationMin: 30,
      sensoryActivities: ["Listen with a warm cup of tea in hand."],
      caregiverTips: ["This activity improves memory in just a week."],
      cues: [
        {
          entity_id: "fx-music-dolly-parton",
          domain: "music",
          whyThis: "People your age in Memphis loved Marty Robbins too.",
          prompts: ["Shall we hum the Tennessee Waltz together?"],
        },
        {
          entity_id: "fx-music-brenda-lee",
          domain: "music",
          whyThis: "Fans of country & western often love her voice.",
          prompts: ['Tell me about seeing "Pillow Talk" at the pictures.'],
        },
        {
          entity_id: "fx-music-jim-reeves",
          domain: "music",
          whyThis: "Many people who share your era loved his smooth singing.",
          prompts: ["What did you enjoy most about his singing?"],
        },
        {
          entity_id: "fx-tv-andy-griffith",
          domain: "tv",
          whyThis: "Families in your era often gathered around this show.",
          prompts: ["Tell me about watching this with your family."],
        },
      ],
    },
    {
      title: "Sunday Best at the Peabody",
      theme: "Dressing up and dining out",
      format: "sensory",
      durationMin: 35,
      sensoryActivities: ["Pass around a soft silk scarf.", "Smell a fresh cup of coffee together."],
      caregiverTips: ["Offer a choice of two songs rather than asking an open question."],
      cues: [
        {
          entity_id: "fx-place-peabody",
          domain: "place",
          whyThis: "People who share your era and Hometown loved dressing up for this place.",
          prompts: ["Tell me about a night out."],
        },
        {
          entity_id: "fx-book-war-diaries",
          domain: "book",
          whyThis: "A book with a war in its name.",
          prompts: ["Tell me about this book."],
        },
        {
          entity_id: "fx-tv-general-hospital",
          domain: "tv",
          whyThis: "A show that the Avoid List rules out.",
          prompts: ["Tell me about this show."],
        },
      ],
    },
  ],
};
