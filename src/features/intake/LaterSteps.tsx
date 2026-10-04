"use client";

import type { DraftValues, FieldErrors, PendingText } from "./form";
import { AvoidStep } from "./AvoidStep";
import { ReviewSummary } from "./ReviewSummary";
import { SeedStep } from "./SeedStep";
import { StageStep } from "./StageStep";
import type { Resolver } from "./resolver";
import styles from "./Later.module.css";

export interface LaterStepsProps {
  /** 4, 5 or 6. */
  readonly step: number;
  /** What the draft holds so far. */
  readonly values: DraftValues;
  /** The first name as typed, removed from every search before it leaves the device. */
  readonly firstName: string;
  readonly resolver: Resolver;
  readonly errors: FieldErrors;
  /** Saves part of the draft straight away (a Seed was confirmed, a stage was chosen...). */
  readonly onValues: (patch: Partial<DraftValues>) => void;
  readonly onPending: (key: keyof PendingText, text: string) => void;
  readonly onEdit: (step: number) => void;
}

/** Steps 4-6 of the wizard: Seeds, the Avoid List, then Stage and review (FR-4, FR-5, FR-6). */
export function LaterSteps({ step, values, firstName, resolver, errors, onValues, onPending, onEdit }: LaterStepsProps) {
  if (step === 4) {
    const avoidedIds = new Set((values.avoidList ?? []).flatMap((item) => (item.kind === "entity" ? [item.entityId] : [])));
    return (
      <SeedStep
        seeds={values.seeds ?? []}
        avoidedIds={avoidedIds}
        resolver={resolver}
        firstName={firstName}
        error={errors.seeds}
        onChange={(seeds) => onValues({ seeds })}
        onTextChange={(text) => onPending("seeds", text)}
      />
    );
  }
  if (step === 5) {
    return (
      <AvoidStep
        avoidList={values.avoidList ?? []}
        sensitiveThemesOptIn={values.sensitiveThemesOptIn === true}
        seedIds={new Set((values.seeds ?? []).map((seed) => seed.entityId))}
        resolver={resolver}
        firstName={firstName}
        errors={errors}
        onChange={(patch) => onValues(patch)}
        onTextChange={onPending}
      />
    );
  }
  return (
    <div className={styles.stack}>
      <StageStep
        value={values.dementiaStage}
        personName={firstName}
        error={errors.dementiaStage}
        onChange={(dementiaStage) => onValues({ dementiaStage })}
      />
      <section aria-labelledby="review-heading" className={styles.listSection}>
        <h2 id="review-heading" className={styles.subhead}>
          Review
        </h2>
        <ReviewSummary values={values} onEdit={onEdit} />
      </section>
    </div>
  );
}
