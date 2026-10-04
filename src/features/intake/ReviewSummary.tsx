import type { ReactNode } from "react";
import { SecondaryButton } from "@/components/site/MessagePage";
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, reminiscenceWindow } from "@/domain/window";
import { avoidName } from "./avoid";
import type { DraftValues } from "./form";
import { stepInfo } from "./steps";
import styles from "./Review.module.css";

export interface ReviewSummaryProps {
  readonly values: DraftValues;
  readonly onEdit: (step: number) => void;
}

function Row({ step, onEdit, label, children }: { step: number; onEdit: (step: number) => void; label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.term}>{label}</dt>
      <dd className={styles.detail}>{children}</dd>
      <dd className={styles.edit}>
        <SecondaryButton onClick={() => onEdit(step)} aria-label={`Edit ${stepInfo(step).label}`}>
          Edit
        </SecondaryButton>
      </dd>
    </div>
  );
}

const NOT_ADDED = <span className={styles.none}>Not added</span>;

function joinParts(parts: ReadonlyArray<string | undefined>): ReactNode {
  const present = parts.filter((part): part is string => part !== undefined && part !== "");
  return present.length === 0 ? NOT_ADDED : present.join(" · ");
}

/** Everything told so far, with an Edit link back to the step it came from (UX section 3). */
export function ReviewSummary({ values, onEdit }: ReviewSummaryProps) {
  const { firstName, birthYear, hometown, youngAdultCity, careLocation, heritage, language, occupation } = values;
  const window =
    birthYear !== undefined && birthYear >= MIN_BIRTH_YEAR && birthYear <= MAX_BIRTH_YEAR
      ? reminiscenceWindow(birthYear)
      : null;
  const seeds = values.seeds ?? [];
  const avoid = values.avoidList ?? [];

  return (
    <dl className={styles.summary}>
      <Row step={1} onEdit={onEdit} label="About them">
        {firstName ?? ""}
        {birthYear !== undefined && <>, born {birthYear}</>}
        {window !== null && <span className={styles.window}>Reminiscence Window: {window.label}</span>}
      </Row>
      <Row step={2} onEdit={onEdit} label="Places">
        {joinParts([hometown, youngAdultCity, careLocation])}
      </Row>
      <Row step={3} onEdit={onEdit} label="Roots">
        {joinParts([heritage, language, occupation])}
      </Row>
      <Row step={4} onEdit={onEdit} label="Favorites">
        {seeds.length === 0 ? NOT_ADDED : seeds.map((seed) => seed.name).join(" · ")}
      </Row>
      <Row step={5} onEdit={onEdit} label="Avoid List">
        {avoid.length === 0 ? <span className={styles.none}>Nothing added</span> : avoid.map(avoidName).join(" · ")}
        <span className={styles.window}>
          Themes like war, loss or hospitals: {values.sensitiveThemesOptIn === true ? "included" : "left out"}
        </span>
      </Row>
    </dl>
  );
}
