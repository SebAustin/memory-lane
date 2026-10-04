"use client";

import { useEffect, useId, useRef } from "react";
import type { SeedCandidate } from "@/contracts";
import { PrimaryButton, SecondaryButton } from "@/components/site/MessagePage";
import { CandidateThumb } from "./CandidateThumb";
import { candidateKind } from "./candidate";
import styles from "./Picker.module.css";

export interface ConfirmPolaroidProps {
  readonly candidate: SeedCandidate;
  /** Why this one cannot be added (already added, on the other list), or null. */
  readonly unavailable: string | null;
  readonly addLabel: string;
  readonly onAdd: () => void;
  readonly onReject: () => void;
}

/** One confident match, shown as a print to confirm (UX section 3). It is never added without a click. */
export function ConfirmPolaroid({ candidate, unavailable, addLabel, onAdd, onReject }: ConfirmPolaroidProps) {
  const headingId = useId();
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  return (
    <section className={styles.confirm} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.confirmTitle}>
        Is this the one?
      </h3>
      <figure className={styles.print}>
        <CandidateThumb candidate={candidate} />
        <figcaption className={styles.caption}>
          <span className={styles.printName}>{candidate.name}</span>
          <span className={styles.printKind}>{candidateKind(candidate)}</span>
          {candidate.description !== undefined && <span className={styles.printDesc}>{candidate.description}</span>}
        </figcaption>
      </figure>
      <div className={styles.confirmActions}>
        {unavailable === null ? (
          <PrimaryButton ref={actionRef} onClick={onAdd}>
            {addLabel}
          </PrimaryButton>
        ) : (
          <p className={styles.unavailable}>{unavailable}</p>
        )}
        <SecondaryButton onClick={onReject}>No, search again</SecondaryButton>
      </div>
    </section>
  );
}
