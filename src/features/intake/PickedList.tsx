import type { ReactNode } from "react";
import type { SeedCandidate } from "@/contracts";
import { CandidateThumb } from "./CandidateThumb";
import { candidateKind } from "./candidate";
import styles from "./Picked.module.css";

export interface PickedItem {
  /** Stable key: the entity id, or the topic text. */
  readonly key: string;
  readonly name: string;
  readonly candidate?: Pick<SeedCandidate, "domain" | "year" | "imageUrl" | "name">;
  /** What this item will do, in the Caregiver's words (the Avoid List outcome). */
  readonly outcome?: ReactNode;
  /** Short word for items with no picture, for example "Topic". */
  readonly tag?: string;
}

export interface PickedListProps {
  readonly label: string;
  readonly items: readonly PickedItem[];
  readonly onRemove: (key: string) => void;
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

/** What the Caregiver has chosen so far: small prints on a strip, each with its own Remove. */
export function PickedList({ label, items, onRemove }: PickedListProps) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className={styles.item} data-has-picture={item.candidate !== undefined}>
          {item.candidate !== undefined ? (
            <span className={styles.picture}>
              <CandidateThumb candidate={item.candidate} />
            </span>
          ) : (
            <span className={styles.slip} aria-hidden="true">
              {item.tag ?? "Topic"}
            </span>
          )}
          <span className={styles.text}>
            <span className={styles.name}>{item.name}</span>
            {item.candidate !== undefined && <span className={styles.kind}>{candidateKind(item.candidate)}</span>}
            {item.outcome !== undefined && <span className={styles.outcome}>{item.outcome}</span>}
          </span>
          <button type="button" className={styles.remove} onClick={() => onRemove(item.key)}>
            <Cross />
            <span className="visually-hidden">Remove {item.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
