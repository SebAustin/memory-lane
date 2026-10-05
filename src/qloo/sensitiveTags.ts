import "server-only";

/**
 * The Qloo tags excluded from every request unless the Caregiver opts in to
 * sensitive themes: war, bereavement, hospital or illness (FR-5, PLAN 5.1).
 *
 * [QLOO-GATED] These are `fx-` placeholders until ticket 23 resolves the real
 * Qloo tag ids and replaces them in `src/domain/sensitiveTags.ts`, the single
 * definition (pure data, so `toSignals` can use it on client and server). It
 * is re-exported here so the Qloo module is the one place callers look.
 */
export { SENSITIVE_TAG_IDS } from "@/domain/sensitiveTags";
