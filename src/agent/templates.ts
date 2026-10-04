/**
 * Vetted templates (PLAN section 3.2 step 5, R12, ticket 09). When `checkText`
 * rejects a model string, or a Session needs topping up, the validator swaps in
 * one of these. They are also what the deterministic "Simple Kit" is written
 * from.
 *
 * Copy rules (UX section 8, FR-12):
 * - warm, plain and short; dignity first; no exclamation marks;
 * - open and failure-free: invitations, never questions that test recall;
 * - no outcome claims; no war, loss or illness themes;
 * - never presume a living spouse, parent or any other relative (R12);
 * - the Person's first name is only ever the `{name}` placeholder.
 *
 * Every string here passes `checkText` in its scope (`templates.test.ts`).
 * The shape is `TemplateLibrary` in `src/domain`, so the pure validator takes
 * a library through its context rather than importing this file.
 */
import { deepFreeze } from "@/lib/deep-freeze";
import type { TemplateLibrary } from "@/domain/templateLibrary";

export const TEMPLATES: TemplateLibrary = deepFreeze({
  prompts: {
    music: {
      early: [
        "Tell me about the songs you loved to hear on the radio when you were young.",
        "Tell me about a place where you used to listen to music or dance.",
        "What kind of music did your family put on at home?",
        "Tell me about a tune that makes you want to hum along.",
      ],
      middle: [
        "Tell me about the dances you went to.",
        "What did this music make you feel like doing?",
        "Tell me about a song you used to sing along to.",
        "Tell me about music at your house on a Saturday night.",
      ],
      late: [
        "Shall we listen to this together?",
        "Let's hum along, if you like.",
        "This music is lovely. Tell me what you notice.",
        "Would you like to tap along with me?",
      ],
    },
    film: {
      early: [
        "Tell me about going to the pictures when you were young.",
        "Tell me about a film you watched again and again.",
        "Tell me about who you went to the movies with, and what you wore.",
        "What did you like most about the stars and the stories in films back then?",
      ],
      middle: [
        "Tell me about going to the pictures.",
        "What did you enjoy about films like this?",
        "Tell me about a night out at the cinema.",
        "Tell me about a film star you liked to watch.",
      ],
      late: [
        "Let's look at this picture together.",
        "Tell me what you notice.",
        "Does this picture bring a smile?",
        "What a lovely picture. Shall we look a little longer?",
      ],
    },
    tv: {
      early: [
        "Tell me about the shows your family watched together in the evening.",
        "Tell me about a program you never wanted to miss.",
        "Tell me about the television set you had at home.",
        "Tell me about the characters you liked best.",
      ],
      middle: [
        "Tell me about watching television at home.",
        "What did you enjoy about shows like this?",
        "Tell me about a program you liked to watch.",
        "Tell me about where the television sat in your house.",
      ],
      late: [
        "Here is a show many people enjoyed. Tell me what you see.",
        "Shall we look at this together?",
        "Tell me what you like about this.",
        "What a lovely picture. Take your time.",
      ],
    },
    book: {
      early: [
        "Tell me about a book you loved to read, or to hear read aloud.",
        "Tell me about a place where you liked to read.",
        "Tell me about a story that stayed with you.",
        "Tell me about the books you kept on your shelf at home.",
      ],
      middle: [
        "Tell me about a story you enjoyed.",
        "Tell me about where you liked to read.",
        "What did you like about books like this?",
        "Tell me about a book you liked to hold.",
      ],
      late: [
        "Shall I read a little aloud?",
        "Let's look at this cover together.",
        "Tell me what you see on the cover.",
        "Would you like to hold the book?",
      ],
    },
    place: {
      early: [
        "Tell me about a place you liked to go on a day out.",
        "Tell me about the sights and smells of a place you loved.",
        "Tell me about the food you liked to eat when you went out.",
        "Tell me about the streets and shops near where you grew up.",
      ],
      middle: [
        "Tell me about a place you liked to visit.",
        "What did it look and smell like there?",
        "Tell me about the food you liked there.",
        "Tell me about a day out you enjoyed.",
      ],
      late: [
        "Let's look at this place together.",
        "What do you notice about this place?",
        "Does this place look welcoming?",
        "Shall we imagine a walk here?",
      ],
    },
    brand: {
      early: [
        "Tell me about the shops and brands your family liked.",
        "Tell me about something you used to buy that you loved.",
        "Tell me about the packaging, the smell or the jingle of a brand from home.",
        "Tell me about a favorite treat from the corner store.",
      ],
      middle: [
        "Tell me about a brand your family liked.",
        "What did you like to buy there?",
        "Tell me about shopping on a Saturday.",
        "Tell me about a treat you liked to pick up.",
      ],
      late: [
        "Let's look at this together.",
        "Tell me what you notice.",
        "Does this look like something from home?",
        "What a lovely color. Shall we look closer?",
      ],
    },
  },

  sensoryActivities: {
    early: [
      "Pass around a soft scarf or blanket and talk about how it feels.",
      "Smell something warm, like fresh coffee, cinnamon or baking, and let the aroma lead the chat.",
      "Hold a warm cup of tea together while a favorite record plays.",
      "Tap or clap along to the beat of a tune, and let {name} choose the pace.",
      "Look through a few large photos from the era, one at a time, with no rush.",
      "Pick a scent {name} likes, such as lavender or orange, and take a slow breath together.",
      "If it suits {name}'s diet, share a small taste of something sweet from the era.",
      "Sing a line of a well-loved song and see whether {name} would like to join in.",
    ],
    middle: [
      "Pass around a soft scarf or blanket and talk about how it feels.",
      "Smell something warm, like fresh coffee or cinnamon, and see what it brings to mind.",
      "Hold a warm cup of tea together while the music plays.",
      "Clap or tap along to the beat, and let {name} set the pace.",
      "Look at one large photo at a time and say what you both notice.",
      "Offer a scent {name} likes, such as lavender or orange, and breathe it in together.",
      "If it suits {name}'s diet, share a small sweet taste from the era.",
      "Hum a well-loved tune and see whether {name} would like to join in.",
    ],
    late: [
      "Offer a soft blanket or scarf and let {name} hold it.",
      "Play a gentle, familiar tune quietly and sit together.",
      "Hold a warm mug and breathe in the steam together.",
      "Offer a gentle hand massage with lightly scented lotion, if {name} enjoys it.",
      "Show one large, clear photo at a time and let the picture do the talking.",
      "Sway or tap along in the chair to the music.",
      "Smell fresh flowers or herbs together, slowly.",
      "Hum a soft tune and leave plenty of quiet between the verses.",
    ],
  },

  titleThemes: [
    {
      title: "Saturday Night at the Pictures",
      theme: "Films and stars from the weekends when going to the pictures was the big night out.",
    },
    {
      title: "Songs on the Radio",
      theme: "Tunes that drifted out of the kitchen radio and the car speakers.",
    },
    {
      title: "Sunday Best",
      theme: "Dressing up, church bells and the music of a slow Sunday.",
    },
    {
      title: "Around the Kitchen Table",
      theme: "Family meals, favorite dishes and the talk that went with them.",
    },
    {
      title: "Dance Hall Days",
      theme: "The music, the shoes and the fun of a night out dancing.",
    },
    {
      title: "The Neighborhood Shops",
      theme: "Corner stores, market stalls and the brands everyone knew.",
    },
    {
      title: "Evenings by the Television",
      theme: "Shows the whole family gathered to watch.",
    },
    {
      title: "A Good Book and a Quiet Corner",
      theme: "Stories, favorite authors and the places we liked to read.",
    },
    {
      title: "Day Trips and Holidays",
      theme: "Places we loved to visit, from the seaside to the town square.",
    },
    {
      title: "Summer Afternoons",
      theme: "Long days, open windows and music drifting in.",
    },
  ],

  caregiverTips: {
    early: [
      "There are no right answers. Let {name} lead, and enjoy the stories that come.",
      "Leave gaps of quiet. Give {name} time before you offer another Prompt.",
      "Skip any Cue that does not land. It is fine to move on.",
      "Follow where {name} wants to go, even if it is a different story.",
      "Stop if {name} seems upset, and move to something calm.",
    ],
    middle: [
      "Give one Prompt at a time, and keep it short.",
      "Let {name} lead. A nod or a smile is an answer too.",
      "Offer a choice between two things rather than an open-ended request.",
      "Skip any Cue that does not land, and move on kindly.",
      "Stop if {name} seems upset, and move to something calm.",
    ],
    late: [
      "Go slowly. A look, a smile or a hum is a wonderful answer.",
      "Sit close, speak softly and let the pictures and music do the work.",
      "Use touch and scent only if {name} enjoys them, and stop if {name} pulls away.",
      "Skip any Cue that does not land, and move on kindly.",
      "Stop if {name} seems upset, and move to something calm.",
    ],
  },

  whyThis: {
    music: "People who share {name}'s era and taste often loved music like this.",
    film: "People who share {name}'s era and taste often enjoyed films like this.",
    tv: "People who share {name}'s era and taste often watched shows like this.",
    book: "People who share {name}'s era and taste often read books like this.",
    place: "People who share {name}'s era and taste often loved places like this.",
    brand: "People who share {name}'s era and taste often liked brands like this.",
  },
});
