"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { SeedCandidate } from "@/contracts";
import { SecondaryButton } from "@/components/site/MessagePage";
import { ConfirmPolaroid } from "./ConfirmPolaroid";
import { DisambiguationGroup } from "./DisambiguationGroup";
import type { Resolver } from "./resolver";
import { fieldId, InlineError } from "./TextField";
import { useEntityLookup, type Lookup } from "./useEntityLookup";
import fieldStyles from "./TextField.module.css";
import styles from "./Picker.module.css";

export interface EntityPickerProps {
  readonly resolver: Resolver;
  /** Removed from the text before it is sent to Qloo. */
  readonly firstName: string;
  /** Which error the wizard can point at this box with. */
  readonly errorKey: "seeds" | "avoidEntity";
  readonly label: string;
  readonly hint: string;
  /** Verb for confirming a match, for example "Add to favorites". */
  readonly addLabel: string;
  /** Why a candidate cannot be added (already added, on the other list), or null. */
  readonly unavailable: (candidate: SeedCandidate) => string | null;
  /** True when no more can be added. */
  readonly full: boolean;
  readonly fullMessage: string;
  /** A problem the wizard found with this box, in plain words. */
  readonly error?: string;
  readonly onAdd: (candidate: SeedCandidate) => void;
  /** The text in the box changed, so the wizard can refuse to move on past unmatched text. */
  readonly onTextChange: (text: string) => void;
}

const quote = (text: string): string => `'${text}'`;

/** What the Caregiver is told while, or after, a lookup. A string means a plain status line. */
function statusLine(lookup: Lookup): string | null {
  switch (lookup.phase) {
    case "searching":
      return `Looking for ${quote(lookup.query)}…`;
    case "none":
      return `We couldn't find ${quote(lookup.query)}. Check the spelling or try the full name.`;
    case "unreachable":
      return "We can't reach Qloo right now. Your answers are saved.";
    case "busy":
      return `That was a lot of searches at once. Wait ${lookup.retryAfterSec} seconds, then try again.`;
    case "invalid":
      return "Type the name of something they loved.";
    default:
      return null;
  }
}

/**
 * A search box that resolves what the Caregiver types into a confirmed Qloo
 * entity (FR-4, FR-5). One confident match is shown to confirm; an ambiguous
 * one becomes a choice; no result and Qloo trouble each say what happened and
 * what to do. Unresolved text is never accepted: it can only leave the box as
 * a confirmed entity, or be cleared.
 */
export function EntityPicker({
  resolver,
  firstName,
  errorKey,
  label,
  hint,
  addLabel,
  unavailable,
  full,
  fullMessage,
  error,
  onAdd,
  onTextChange,
}: EntityPickerProps) {
  const [text, setText] = useState("");
  const { lookup, find, reset } = useEntityLookup(resolver, firstName);
  const inputRef = useRef<HTMLInputElement>(null);

  const changeText = (value: string) => {
    setText(value);
    onTextChange(value);
    if (lookup.phase !== "idle") reset();
  };

  const backToBox = () => {
    reset();
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const add = (candidate: SeedCandidate) => {
    onAdd(candidate);
    setText("");
    onTextChange("");
    reset();
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault(); // Enter looks the name up; it must not submit the wizard's form
    if (!full) void find(text);
  };

  const status = statusLine(lookup);
  const searching = lookup.phase === "searching";
  const id = fieldId(errorKey);

  return (
    <div className={styles.picker}>
      <div className={fieldStyles.field} data-invalid={error !== undefined ? "true" : undefined}>
        <label htmlFor={id} className={fieldStyles.label}>
          {label}
        </label>
        <p className={fieldStyles.hint} id={`${id}-hint`}>
          {hint}
        </p>
        <div className={styles.row}>
          <input
            ref={inputRef}
            id={id}
            type="text"
            className={`${fieldStyles.input} ${styles.input}`}
            value={text}
            disabled={full}
            onChange={(event) => changeText(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            aria-invalid={error !== undefined ? true : undefined}
            aria-describedby={error === undefined ? `${id}-hint` : `${id}-hint ${id}-error`}
          />
          <button type="button" className={styles.find} disabled={full || searching} onClick={() => void find(text)}>
            Find
          </button>
        </div>
        {error !== undefined && <InlineError id={`${id}-error`} message={error} />}
      </div>

      {full && <p className={styles.full}>{fullMessage}</p>}

      <div role="status" aria-live="polite" className={styles.statusSlot}>
        {status !== null && (
          <p className={styles.status} data-phase={lookup.phase}>
            <span>{status}</span>
            {lookup.phase === "none" && lookup.hint !== undefined && <span className={styles.margin}>{lookup.hint}</span>}
            {lookup.phase === "unreachable" && (
              <SecondaryButton onClick={() => void find(lookup.query)}>Retry</SecondaryButton>
            )}
          </p>
        )}
      </div>

      {lookup.phase === "confirm" && (
        <ConfirmPolaroid
          candidate={lookup.candidate}
          unavailable={unavailable(lookup.candidate)}
          addLabel={`Yes, ${addLabel.charAt(0).toLowerCase()}${addLabel.slice(1)}`}
          onAdd={() => add(lookup.candidate)}
          onReject={backToBox}
        />
      )}
      {lookup.phase === "choose" && (
        <DisambiguationGroup
          query={lookup.query}
          candidates={lookup.candidates}
          unavailable={unavailable}
          addLabel={addLabel}
          onChoose={add}
          onNone={backToBox}
        />
      )}
    </div>
  );
}
