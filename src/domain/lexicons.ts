/**
 * Word lists behind `checkText` (PLAN section 3.2 R4, EVALS section 4).
 * Pure data: they run on client and server. They lean conservative on
 * purpose: a false hit costs one vetted template, a miss could put a quiz,
 * a cure claim or a painful topic in front of the Person.
 */

/**
 * Prompts that test recall (FR-12). Matched case-insensitively against the
 * text as written. Open invitations such as "Tell me about the dances you
 * went to" never match.
 */
export const QUIZ_PATTERNS: readonly RegExp[] = [
  /\bdo you (?:still |even )?(?:remember|recall|know)\b/i,
  /\bcan you (?:still )?(?:remember|recall|name|tell me (?:what|which|when|who|where))\b/i,
  /\b(?:remember|recall) (?:when|the name|what|who|where|which|how many)\b/i,
  /\bwhat (?:year|decade|month|date|age)\b/i,
  /\bwhat (?:was|is|were) the (?:name|title)\b/i,
  /\bwhich (?:year|decade)\b/i,
  /\bwho (?:was|were|is|are|sang|wrote|played|starred|directed)\b/i,
  /\bwhen did (?:you|they|it|he|she)\b/i,
  /\bhow (?:old|many)\b/i,
  /\bname (?:the|these|those|that|this|three|two|four|five|any|all|some)\b/i,
  /\b(?:quiz|trivia|test your)\b/i,
];

/**
 * Therapeutic-outcome claims (SC-7, UX section 8). Applies to headings and
 * body text alike. "treat" as a noun (a special treat) and "healthy" are fine.
 */
export const CLAIM_PATTERNS: readonly RegExp[] = [
  /\btherap(?:y|ies|eutic|eutically|ist|ists)\b/i,
  /\bheal(?:s|ed|ing)?\b/i,
  /\bcur(?:e|es|ed|ing|ative)\b/i,
  /\btreatments?\b/i,
  /\btreat(?:s|ed|ing)?\b[^.?!]{0,12}\b(?:dementia|alzheimer\w*|symptoms?|conditions?|disease)\b/i,
  /\b(?:improv|boost|enhanc|strengthen|sharpen|restor|revers)\w*\b[^.?!]{0,25}\b(?:memory|memories|cognition|cognitive|recall|brain|mind|mood|symptoms?|behaviou?r|agitation|anxiety|depression|well-?being)\b/i,
  /\b(?:slow|delay|prevent|halt|reduce|relieve|alleviate|ease|fight|combat)\w*\b[^.?!]{0,20}\b(?:decline|progression|dementia|alzheimer\w*|symptoms?|agitation|anxiety|depression|loneliness|memory loss|forgetfulness|confusion)\b/i,
  /\b(?:clinically|scientifically|medically) (?:proven|tested|shown)\b/i,
  /\bproven to\b/i,
  /\bmemory (?:boost\w*|improvement|training|exercises?|therapy|rehabilitation)\b/i,
  /\bbrain (?:training|exercises?|workouts?|boost\w*|games?)\b/i,
  /\bcognitive (?:benefits?|improvement|stimulation|training|therapy|decline|rehabilitation)\b/i,
  /\bkeeps? (?:the )?(?:mind|brain|memory) (?:sharp|active|alive)\b/i,
];

/**
 * War, loss and illness themes, kept out of every string unless the
 * Caregiver opts in (EVALS section 4). Matched whole-word through the
 * Avoid-List normalization (case, accents and a trailing plural "s" ignored),
 * so list singular forms plus irregular inflections.
 */
export const SENSITIVE_TERMS: readonly string[] = [
  // war and violence
  "war",
  "wartime",
  "warfare",
  "battlefield",
  "soldier",
  "combat",
  "bombing",
  "bomb",
  "invasion",
  "killed",
  "murder",
  "massacre",
  "holocaust",
  "genocide",
  // loss and grief
  "death",
  "die",
  "died",
  "dying",
  "funeral",
  "grief",
  "grieve",
  "grieved",
  "grieving",
  "mourn",
  "mourning",
  "bereavement",
  "bereaved",
  "widow",
  "widower",
  "widowed",
  "passed away",
  "pass away",
  "late husband",
  "late wife",
  "late mother",
  "late father",
  "cemetery",
  "grave",
  "orphan",
  "suicide",
  "tragedy",
  "tragic",
  // illness and hospitals
  "hospital",
  "surgery",
  "cancer",
  "illness",
  "sickness",
  "diagnosis",
  "terminal",
  "chemotherapy",
  "ambulance",
  "intensive care",
  "emergency room",
];

/** Days of the week: always safe to name. */
export const DAYS: readonly string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Months: always safe to name. */
export const MONTHS: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Holidays and festivals: always safe to name (PLAN section 3.2 allow-list). */
export const HOLIDAYS: readonly string[] = [
  "Christmas",
  "Christmas Eve",
  "Christmas Day",
  "Boxing Day",
  "Easter",
  "Easter Sunday",
  "Good Friday",
  "Thanksgiving",
  "Halloween",
  "Hanukkah",
  "Passover",
  "Diwali",
  "Ramadan",
  "Eid",
  "Lent",
  "Advent",
  "Pentecost",
  "Mardi Gras",
  "Carnival",
  "Midsummer",
  "New Year",
  "New Year's Eve",
  "New Year's Day",
  "Lunar New Year",
  "Chinese New Year",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  "Memorial Day",
  "Labor Day",
  "Independence Day",
  "Fourth of July",
  "St Patrick's Day",
  "Cinco de Mayo",
  "Day of the Dead",
];
