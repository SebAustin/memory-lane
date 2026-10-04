"use client";

import { useId } from "react";
import type { AvoidItem, SeedCandidate } from "@/contracts";
import { avoidKey, avoidName, avoidOutcome, planTopic } from "./avoid";
import { EntityPicker } from "./EntityPicker";
import { MAX_AVOID_ITEMS, type FieldErrors } from "./form";
import { PickedList, type PickedItem } from "./PickedList";
import type { Resolver } from "./resolver";
import { TopicField } from "./TopicField";
import styles from "./Later.module.css";

export interface AvoidStepProps {
  readonly avoidList: readonly AvoidItem[];
  readonly sensitiveThemesOptIn: boolean;
  /** Seeds: something on the Avoid List cannot also be a favorite. */
  readonly seedIds: ReadonlySet<string>;
  readonly resolver: Resolver;
  readonly firstName: string;
  readonly errors: FieldErrors;
  readonly onChange: (patch: { avoidList?: AvoidItem[]; sensitiveThemesOptIn?: boolean }) => void;
  readonly onTextChange: (key: "avoidEntity" | "avoidTopic", text: string) => void;
}

function itemsOf(avoidList: readonly AvoidItem[]): PickedItem[] {
  return avoidList.map((item) => ({
    key: avoidKey(item),
    name: avoidName(item),
    outcome: avoidOutcome(item),
    ...(item.kind === "entity"
      ? { candidate: { name: item.name, domain: item.domain, imageUrl: null } }
      : { tag: item.kind === "tag" ? "Tag" : "Topic" }),
  }));
}

/**
 * Step 5: things that might upset the Person (FR-5). Named entities resolve
 * like Seeds. Topics show how they will be enforced: matched to a Qloo tag, or
 * kept out of conversation Prompts. Sensitive themes stay out unless opted in.
 */
export function AvoidStep({
  avoidList,
  sensitiveThemesOptIn,
  seedIds,
  resolver,
  firstName,
  errors,
  onChange,
  onTextChange,
}: AvoidStepProps) {
  const toggleId = useId();
  const full = avoidList.length >= MAX_AVOID_ITEMS;
  const avoided = new Set(avoidList.flatMap((item) => (item.kind === "entity" ? [item.entityId] : [])));

  const unavailable = (candidate: SeedCandidate): string | null => {
    if (avoided.has(candidate.entityId)) return "Already on the Avoid List";
    return seedIds.has(candidate.entityId) ? "One of your favorites" : null;
  };

  const addEntity = (candidate: SeedCandidate) =>
    onChange({
      avoidList: [...avoidList, { kind: "entity", entityId: candidate.entityId, name: candidate.name, domain: candidate.domain }],
    });

  const addTopic = async (text: string): Promise<string | null> => {
    const plan = planTopic(await resolver.tag(text, { firstName }), text, avoidList);
    if (plan.item !== undefined) onChange({ avoidList: [...avoidList, plan.item] });
    return plan.message;
  };

  return (
    <div className={styles.stack}>
      <EntityPicker
        resolver={resolver}
        firstName={firstName}
        errorKey="avoidEntity"
        label="Add something by name"
        hint="A film, show, singer, book or place that could upset them. Qloo will leave it out of every Kit."
        addLabel="Add to Avoid List"
        unavailable={unavailable}
        full={full}
        fullMessage={`That is ${MAX_AVOID_ITEMS}, the most the Avoid List holds. Remove one to add another.`}
        error={errors.avoidEntity}
        onAdd={addEntity}
        onTextChange={(text) => onTextChange("avoidEntity", text)}
      />

      <TopicField
        full={full}
        error={errors.avoidTopic}
        onAdd={addTopic}
        onTextChange={(text) => onTextChange("avoidTopic", text)}
      />

      <section className={styles.listSection} aria-labelledby={`${toggleId}-list`}>
        <h2 id={`${toggleId}-list`} className={styles.subhead}>
          On the Avoid List <span className={styles.subcount}>{avoidList.length} of {MAX_AVOID_ITEMS}</span>
        </h2>
        {avoidList.length === 0 ? (
          <p className={styles.empty}>Nothing yet. This step is optional, so you can skip it.</p>
        ) : (
          <PickedList
            label="Avoid List"
            items={itemsOf(avoidList)}
            onRemove={(key) => onChange({ avoidList: avoidList.filter((item) => avoidKey(item) !== key) })}
          />
        )}
      </section>

      <div className={styles.toggle}>
        <input
          id={toggleId}
          type="checkbox"
          className="visually-hidden"
          checked={sensitiveThemesOptIn}
          onChange={(event) => onChange({ sensitiveThemesOptIn: event.target.checked })}
          aria-describedby={`${toggleId}-hint`}
        />
        <label htmlFor={toggleId} className={styles.toggleLabel}>
          <span className={styles.switch} aria-hidden="true" />
          <span className={styles.toggleText}>
            <strong>Include themes like war, loss or hospitals</strong>
            <span id={`${toggleId}-hint`} className={styles.toggleHint}>
              Some veterans enjoy these. Leave off if unsure.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
