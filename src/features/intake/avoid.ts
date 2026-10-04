import type { AvoidItem } from "@/contracts";
import type { TagOutcome } from "./resolver";

/** What an Avoid List item is called. */
export const avoidName = (item: AvoidItem): string => (item.kind === "topic" ? item.text : item.name);

/** A stable key for one item, across kinds. */
export function avoidKey(item: AvoidItem): string {
  switch (item.kind) {
    case "entity":
      return `entity:${item.entityId}`;
    case "tag":
      return `tag:${item.tagId}`;
    case "topic":
      return `topic:${item.text.toLowerCase()}`;
  }
}

/** How an item will be enforced, in the Caregiver's words (UX section 3). */
export function avoidOutcome(item: AvoidItem): string {
  switch (item.kind) {
    case "entity":
      return "Left out of every Kit, by Qloo and by name";
    case "tag":
      return `Matched to a Qloo tag: ${item.name}`;
    case "topic":
      return "We'll keep this out of conversation Prompts";
  }
}

const quote = (text: string): string => `'${text}'`;

export interface TopicPlan {
  /** What to add to the Avoid List; absent when it is already there. */
  readonly item?: AvoidItem;
  /** What to tell the Caregiver. */
  readonly message: string;
}

/**
 * Decides what adding a typed topic does, once Qloo has been asked for a tag.
 * A confident tag becomes a tag item; anything else stays a plain topic, so
 * the Caregiver's words are never lost and never need Qloo to work.
 */
export function planTopic(outcome: TagOutcome, typed: string, existing: readonly AvoidItem[]): TopicPlan {
  const text = typed.trim();
  const taken = new Set(existing.map((item) => avoidName(item).toLowerCase()));

  if (outcome.kind === "tag") {
    const alreadyThere = existing.some((item) => item.kind === "tag" && item.tagId === outcome.tag.id);
    if (alreadyThere || taken.has(outcome.tag.name.toLowerCase())) {
      return { message: `${quote(text)} is already on the list.` };
    }
    return {
      item: { kind: "tag", tagId: outcome.tag.id, name: outcome.tag.name },
      message: `${quote(text)} matched a Qloo tag: ${outcome.tag.name}.`,
    };
  }
  if (taken.has(text.toLowerCase())) return { message: `${quote(text)} is already on the list.` };
  return {
    item: { kind: "topic", text },
    message: outcome.reachedQloo
      ? `We'll keep ${quote(text)} out of conversation Prompts.`
      : `We couldn't reach Qloo, so ${quote(text)} will only be kept out of conversation Prompts.`,
  };
}
