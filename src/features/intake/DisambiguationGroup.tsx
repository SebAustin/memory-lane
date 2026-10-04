"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SeedCandidate } from "@/contracts";
import { PrimaryButton } from "@/components/site/MessagePage";
import { CandidateThumb } from "./CandidateThumb";
import { candidateKind } from "./candidate";
import styles from "./Disambiguation.module.css";

export interface DisambiguationGroupProps {
  /** What the Caregiver typed. Names the question when the candidates do not share one name. */
  readonly query: string;
  readonly candidates: readonly SeedCandidate[];
  /** Why a candidate cannot be chosen (already added, on the other list), or null. */
  readonly unavailable: (candidate: SeedCandidate) => string | null;
  /** The Caregiver chose a candidate and confirmed it. */
  readonly onChoose: (candidate: SeedCandidate) => void;
  /** "None of these": go back to the box and try again. */
  readonly onNone: () => void;
  /** Verb for the confirm button, for example "Add to favorites". */
  readonly addLabel: string;
}

const NONE = "none";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
  );
}

/**
 * "Which Doris Day did you mean?" (UX section 3): 2-5 mini-polaroid chips and a
 * "None of these", as a real radiogroup. Nothing is chosen for the Caregiver:
 * no chip starts selected, and a chosen chip still needs an explicit confirm.
 */
export function DisambiguationGroup({
  query,
  candidates,
  unavailable,
  onChoose,
  onNone,
  addLabel,
}: DisambiguationGroupProps) {
  const base = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const groupRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    groupRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
  }, []);

  const sharedName = candidates.every((candidate) => candidate.name === candidates[0]?.name)
    ? candidates[0]?.name
    : undefined;
  const subject = sharedName ?? query;
  const chosen = candidates.find((candidate) => candidate.entityId === selected);

  const confirm = () => {
    if (chosen !== undefined) onChoose(chosen);
    else if (selected === NONE) onNone();
  };

  return (
    <fieldset ref={groupRef} className={styles.group} role="radiogroup" aria-labelledby={`${base}-legend`}>
      <legend id={`${base}-legend`} className={styles.legend}>
        Which {subject} did you mean?
      </legend>
      <ul className={styles.grid}>
        {candidates.map((candidate) => {
          const reason = unavailable(candidate);
          const id = `${base}-${candidate.entityId}`;
          return (
            <li key={candidate.entityId} className={styles.item}>
              <label className={styles.chip} htmlFor={id} data-unavailable={reason !== null}>
                <input
                  id={id}
                  type="radio"
                  name={`${base}-choice`}
                  className="visually-hidden"
                  value={candidate.entityId}
                  checked={selected === candidate.entityId}
                  disabled={reason !== null}
                  onChange={() => setSelected(candidate.entityId)}
                />
                <span className={styles.mat}>
                  <CandidateThumb candidate={candidate} />
                  <span className={styles.name}>{candidate.name}</span>
                  <span className={styles.kind}>{candidateKind(candidate)}</span>
                  {candidate.description !== undefined && <span className={styles.desc}>{candidate.description}</span>}
                  {reason !== null && <span className={styles.reason}>{reason}</span>}
                </span>
                <span className={styles.stamp} aria-hidden="true">
                  <Check />
                </span>
              </label>
            </li>
          );
        })}
        <li className={styles.item}>
          <label className={`${styles.chip} ${styles.none}`} htmlFor={`${base}-none`}>
            <input
              id={`${base}-none`}
              type="radio"
              name={`${base}-choice`}
              className="visually-hidden"
              value={NONE}
              checked={selected === NONE}
              onChange={() => setSelected(NONE)}
            />
            <span className={styles.mat}>
              <span className={styles.name}>None of these</span>
              <span className={styles.desc}>Try the full name or another spelling.</span>
            </span>
            <span className={styles.stamp} aria-hidden="true">
              <Check />
            </span>
          </label>
        </li>
      </ul>
      <div className={styles.actions}>
        <PrimaryButton disabled={selected === null} onClick={confirm}>
          {selected === NONE ? "Search again" : addLabel}
        </PrimaryButton>
        {selected === null && <p className={styles.note}>Choose one to continue. We never pick for you.</p>}
      </div>
    </fieldset>
  );
}
