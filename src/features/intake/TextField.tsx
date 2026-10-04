import { useId, useMemo, type HTMLAttributes } from "react";
import { detectPiiRisk, type PiiKind } from "@/domain/pii";
import type { FieldName } from "./form";
import styles from "./TextField.module.css";

/** Calm, plain hints (UX section 3). They never block, and never repeat what was typed. */
const PII_HINT: Readonly<Record<PiiKind, string>> = {
  surname: "That looks like a full name. First name only, please. We never need a surname.",
  address: "That looks like an address. A town or city is enough.",
  diagnosis: "That looks like a medical detail. You don't need to share it here.",
};

export interface TextFieldProps {
  readonly name: FieldName;
  readonly label: string;
  readonly value: string;
  readonly onChange: (name: FieldName, value: string) => void;
  /** Shown beside the label as "optional". */
  readonly optional?: boolean;
  /** One short line of help under the label. */
  readonly hint?: string;
  /** Plain-language error, shown under the field. */
  readonly error?: string;
  /** Which kinds of personal detail to nudge about in this field. */
  readonly piiKinds?: readonly PiiKind[];
  readonly width?: "short";
  readonly inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly autoCapitalize?: "words" | "off";
}

/** The id of a field's input, so the error summary can link to it. */
export const fieldId = (name: FieldName): string => `intake-${name}`;

/**
 * A labelled text input with an optional hint, an inline error and gentle
 * personal-detail hints (FR-3, NFR-1). Everything the input needs to be
 * understood is real text tied to it with `for` and `aria-describedby`.
 */
export function TextField({
  name,
  label,
  value,
  onChange,
  optional = false,
  hint,
  error,
  piiKinds = [],
  width,
  inputMode,
  autoCapitalize = "off",
}: TextFieldProps) {
  const base = useId();
  const id = fieldId(name);
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const piiId = `${base}-pii`;
  const findings = useMemo(() => detectPiiRisk(value, { kinds: piiKinds }), [value, piiKinds]);

  const describedBy = [hint !== undefined && hintId, error !== undefined && errorId, findings.length > 0 && piiId]
    .filter((part): part is string => part !== false)
    .join(" ");

  return (
    <div className={styles.field} data-invalid={error !== undefined ? "true" : undefined}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}>optional</span>}
      </label>
      {hint !== undefined && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        type="text"
        className={styles.input}
        data-width={width}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={describedBy === "" ? undefined : describedBy}
      />
      {error !== undefined && (
        <p id={errorId} className={styles.error}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 3l10 18H2z" />
            <path d="M12 10v5M12 18h.01" />
          </svg>
          <span>
            <span className="visually-hidden">Error: </span>
            {error}
          </span>
        </p>
      )}
      <div aria-live="polite">
        {findings.length > 0 && (
          <p id={piiId} className={styles.piiHint}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            <span>{findings.map((finding) => PII_HINT[finding.kind]).join(" ")}</span>
          </p>
        )}
      </div>
    </div>
  );
}
