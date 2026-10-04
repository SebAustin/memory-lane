/**
 * Qloo tags excluded from every request unless the Caregiver opts in to
 * sensitive themes (war, bereavement, hospital or illness; FR-5, PLAN 5.1).
 *
 * [QLOO-GATED] These are `fx-` placeholders until slice K resolves the real
 * Qloo tag ids (`src/qloo/sensitiveTags.ts` then replaces this list). Until
 * then the `checkText` lexicon and the Avoid List name screening are the
 * active guards. Pure data, so it can be shared by the browser and the server.
 */
export const SENSITIVE_TAG_IDS: readonly string[] = [
  "fx-tag-war",
  "fx-tag-bereavement",
  "fx-tag-hospital",
];
