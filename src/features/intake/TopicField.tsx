"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { InlineError, fieldId } from "./TextField";
import fieldStyles from "./TextField.module.css";
import styles from "./Picker.module.css";

const MAX_TOPIC = 60;
const MIN_TOPIC = 2;

export interface TopicFieldProps {
  /** Checks a topic and adds it. Resolves to a message to tell the Caregiver, or null when there is nothing to say. */
  readonly onAdd: (text: string) => Promise<string | null>;
  /** Whether no more can be added. */
  readonly full: boolean;
  readonly error?: string;
  readonly onTextChange: (text: string) => void;
}

/**
 * Free-text Avoid topics ("hospitals", "a war"). Adding one asks Qloo for a
 * matching tag; either way the topic is kept out of conversation Prompts.
 */
export function TopicField({ onAdd, full, error, onTextChange }: TopicFieldProps) {
  const base = useId();
  const id = fieldId("avoidTopic");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const change = (value: string) => {
    setText(value);
    setProblem(null);
    onTextChange(value);
  };

  async function add() {
    const topic = text.trim();
    if (topic.length < MIN_TOPIC) {
      setProblem(`Use ${MIN_TOPIC} to ${MAX_TOPIC} characters.`);
      return;
    }
    setBusy(true);
    setNote(null);
    const message = await onAdd(topic);
    setBusy(false);
    setText("");
    onTextChange("");
    setNote(message);
    document.getElementById(id)?.focus();
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!full && !busy) void add();
  };

  const shown = problem ?? error;
  const describedBy = [`${base}-hint`, shown !== undefined && `${base}-error`].filter(Boolean).join(" ");

  return (
    <div className={styles.picker}>
      <div className={fieldStyles.field} data-invalid={shown !== undefined ? "true" : undefined}>
        <label htmlFor={id} className={fieldStyles.label}>
          Add a topic
        </label>
        <p id={`${base}-hint`} className={fieldStyles.hint}>
          A word or phrase, like hospitals or a war. We keep it out of conversation Prompts, and match it to a Qloo tag when we can.
        </p>
        <div className={styles.row}>
          <input
            id={id}
            type="text"
            className={`${fieldStyles.input} ${styles.input}`}
            value={text}
            disabled={full}
            maxLength={MAX_TOPIC}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => change(event.target.value)}
            onKeyDown={onKeyDown}
            aria-invalid={shown !== undefined ? true : undefined}
            aria-describedby={describedBy}
          />
          <button type="button" className={styles.find} disabled={full || busy} onClick={() => void add()}>
            Add topic
          </button>
        </div>
        {shown !== undefined && <InlineError id={`${base}-error`} message={shown} />}
      </div>
      <div role="status" aria-live="polite">
        {busy && <p className={styles.status} data-phase="searching">Checking Qloo&hellip;</p>}
        {!busy && note !== null && <p className={styles.status} data-phase="note">{note}</p>}
      </div>
    </div>
  );
}
