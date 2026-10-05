/**
 * Renders the `pnpm validate:demo` report: a deliberately rogue KitDraft, what
 * `validateKit` dropped and repaired (by reason), the compliant Kit, and proof
 * that a second pass changes nothing (ADR 0003, ticket 10).
 */
import { TEMPLATES } from "@/agent/templates";
import type { KitDraft } from "@/contracts";
import { validateKit } from "@/domain/validator";
import { ROGUE_DRAFT, ROGUE_REGISTRY, rogueContext } from "@/domain/validator/rogue";
import type { Drop, Repair, ValidatedKit } from "@/domain/validator/types";

const NAME_OF = new Map(ROGUE_REGISTRY.map((entry) => [entry.entityId, entry.name]));

function rogueLines(draft: KitDraft): string[] {
  return draft.sessions.flatMap((session, index) => [
    `  Session ${index + 1}: "${session.title}" [${session.format}, ${session.durationMin} min]`,
    `    theme: ${session.theme}`,
    `    sensory: ${session.sensoryActivities.length === 0 ? "(none)" : session.sensoryActivities.join(" | ")}`,
    `    tips: ${session.caregiverTips.join(" | ")}`,
    ...session.cues.map((cue) => `    - ${cue.entity_id} (${cue.domain}): ${cue.prompts.join(" / ")}`),
  ]);
}

function dropLines(drops: readonly Drop[]): string[] {
  return drops.map(
    (drop) => `  S${drop.sessionIndex + 1}  ${drop.step.padEnd(10)} ${drop.reason.padEnd(22)} ${drop.entityId}`,
  );
}

function repairLines(repairs: readonly Repair[]): string[] {
  return repairs.map((repair) => {
    const rules = repair.rules === undefined ? "" : `  [${repair.rules.join(", ")}]`;
    return `  S${repair.sessionIndex + 1}  ${repair.step.padEnd(10)} ${repair.reason.padEnd(22)} ${repair.field}${rules}`;
  });
}

function kitLines(kit: ValidatedKit): string[] {
  return kit.sessions.flatMap((session, index) => [
    `  Session ${index + 1}: "${session.title}" [${session.format}, ${session.durationMin} min]`,
    `    theme: ${session.theme}`,
    `    sensory: ${session.sensoryActivities.join(" | ")}`,
    `    tips: ${session.caregiverTips.join(" | ")}`,
    ...session.cues.map((cue) => {
      const flag = cue.outsideWindow === true ? "  (outside the original Window)" : "";
      return `    - ${NAME_OF.get(cue.entity_id) ?? cue.entity_id} (${cue.entity_id})${flag}: ${cue.prompts.join(" / ")}`;
    }),
  ]);
}

/** The whole demo report as text. Pure, so a test can pin it. */
export function renderValidateDemo(): string {
  const ctx = rogueContext(TEMPLATES, "late");
  const first = validateKit(ROGUE_DRAFT, ctx);
  const second = validateKit(first.kit, ctx);
  const idempotent = second.drops.length === 0 && second.repairs.length === 0;

  return [
    "validateKit demo: a rogue model draft, repaired (Margaret, late stage, Window 1956 to 1976)",
    "",
    "ROGUE DRAFT (what the model returned)",
    ...rogueLines(ROGUE_DRAFT),
    "",
    `DROPS (${first.drops.length})`,
    ...dropLines(first.drops),
    "",
    `REPAIRS (${first.repairs.length})`,
    ...repairLines(first.repairs),
    "",
    "COMPLIANT KIT",
    ...kitLines(first.kit),
    "",
    `SECOND PASS: ${second.drops.length} drops, ${second.repairs.length} repairs (${idempotent ? "idempotent" : "NOT idempotent"})`,
    "",
  ].join("\n");
}
