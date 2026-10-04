"use client";

import { useId } from "react";
import type { Stage } from "@/contracts";
import { InlineError, fieldId } from "./TextField";
import styles from "./Stage.module.css";

interface StageCard {
  readonly value: Stage;
  readonly title: string;
  readonly summary: string;
  readonly shape: string;
}

const CARDS: readonly StageCard[] = [
  {
    value: "early",
    title: "Early",
    summary: "Still enjoys a good conversation and the stories behind things.",
    shape: "Sessions lead with talking, with room to wander.",
  },
  {
    value: "middle",
    title: "Middle",
    summary: "Talks in shorter stretches and enjoys things to see, hear and hold.",
    shape: "Sessions mix a little conversation with hands-on moments.",
  },
  {
    value: "late",
    title: "Late",
    summary: "Says little, but responds to faces, music and touch.",
    shape: "Sessions are pictures, sound and touch, with very short Prompts.",
  },
];

export interface StageStepProps {
  readonly value: Stage | undefined;
  readonly personName: string;
  readonly error?: string;
  readonly onChange: (stage: Stage) => void;
}

/** The Dementia Stage as three index cards (UX section 3). None is chosen for the Caregiver. */
export function StageStep({ value, personName, error, onChange }: StageStepProps) {
  const base = useId();
  const who = personName === "" ? "them" : personName;
  return (
    <fieldset className={styles.group} role="radiogroup" aria-labelledby={`${base}-legend`} aria-describedby={`${base}-hint`}
      aria-invalid={error !== undefined ? true : undefined}>
      <legend id={`${base}-legend`} className={styles.legend}>
        Where is {who} on the dementia journey?
      </legend>
      <p id={`${base}-hint`} className={styles.hint}>
        This shapes how each Session is laid out. Not sure? Choose Middle.
      </p>
      <div className={styles.cards}>
        {CARDS.map((card, index) => {
          const id = index === 0 ? fieldId("dementiaStage") : `${base}-${card.value}`;
          return (
            <label key={card.value} htmlFor={id} className={styles.card}>
              <input
                id={id}
                type="radio"
                name={`${base}-stage`}
                className="visually-hidden"
                value={card.value}
                checked={value === card.value}
                onChange={() => onChange(card.value)}
              />
              <span className={styles.face}>
                <span className={styles.title}>{card.title}</span>
                <span className={styles.summary}>{card.summary}</span>
                <span className={styles.shape}>{card.shape}</span>
                <span className={styles.chosen} aria-hidden="true">
                  Chosen
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error !== undefined && <InlineError id={`${base}-error`} message={error} />}
    </fieldset>
  );
}
