"use client";

import type { Seed, SeedCandidate } from "@/contracts";
import { PickedList } from "./PickedList";
import { EntityPicker } from "./EntityPicker";
import { MAX_SEEDS, MIN_SEEDS } from "./form";
import type { Resolver } from "./resolver";
import styles from "./Later.module.css";

export interface SeedStepProps {
  readonly seeds: readonly Seed[];
  /** Entities on the Avoid List: a Seed cannot also be avoided. */
  readonly avoidedIds: ReadonlySet<string>;
  readonly resolver: Resolver;
  readonly firstName: string;
  readonly error?: string;
  readonly onChange: (seeds: Seed[]) => void;
  readonly onTextChange: (text: string) => void;
}

/** A confirmed candidate as a Seed. The description was only there to tell look-alikes apart. */
export function toSeed(candidate: SeedCandidate): Seed {
  return {
    entityId: candidate.entityId,
    name: candidate.name,
    domain: candidate.domain,
    ...(candidate.year === undefined ? {} : { year: candidate.year }),
    imageUrl: candidate.imageUrl,
  };
}

/**
 * Step 4: 2-5 favorites, each confirmed as a real Qloo entity (FR-4). The
 * Seeds are saved to the draft one by one, so a stop halfway loses nothing.
 */
export function SeedStep({ seeds, avoidedIds, resolver, firstName, error, onChange, onTextChange }: SeedStepProps) {
  const chosen = new Set(seeds.map((seed) => seed.entityId));
  const unavailable = (candidate: SeedCandidate): string | null => {
    if (chosen.has(candidate.entityId)) return "Already on your list";
    return avoidedIds.has(candidate.entityId) ? "On your Avoid List" : null;
  };

  return (
    <div className={styles.stack}>
      <EntityPicker
        resolver={resolver}
        firstName={firstName}
        errorKey="seeds"
        label="Add a favorite"
        hint="A singer, film, TV show, book or place they loved. Type a name, then choose Find."
        addLabel="Add to favorites"
        unavailable={unavailable}
        full={seeds.length >= MAX_SEEDS}
        fullMessage={`That is ${MAX_SEEDS}, the most a Kit starts from. Remove one to add another.`}
        error={error}
        onAdd={(candidate) => onChange([...seeds, toSeed(candidate)])}
        onTextChange={onTextChange}
      />
      <p className={styles.count} aria-live="polite" data-ready={seeds.length >= MIN_SEEDS}>
        <strong>
          {seeds.length} of {MAX_SEEDS}
        </strong>{" "}
        favorites chosen.{" "}
        {seeds.length < MIN_SEEDS ? `Choose at least ${MIN_SEEDS}.` : "You can add up to " + String(MAX_SEEDS - seeds.length) + " more."}
      </p>
      <PickedList
        label="Chosen favorites"
        items={seeds.map((seed) => ({ key: seed.entityId, name: seed.name, candidate: seed }))}
        onRemove={(key) => onChange(seeds.filter((seed) => seed.entityId !== key))}
      />
    </div>
  );
}
