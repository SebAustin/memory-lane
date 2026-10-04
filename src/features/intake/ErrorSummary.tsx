import { forwardRef } from "react";
import { fieldId } from "./TextField";
import type { ErrorKey, FieldErrors } from "./form";
import styles from "./ErrorSummary.module.css";

export interface ErrorSummaryProps {
  readonly errors: FieldErrors;
  /** Plain names for the fields, in the order they appear on the page. */
  readonly labels: Readonly<Partial<Record<ErrorKey, string>>>;
}

/**
 * Lists what needs fixing, with a link to each field (NFR-1). The wizard moves
 * focus here when a step fails to validate, so a keyboard or screen-reader
 * user lands on the explanation first and can jump straight to the field.
 */
export const ErrorSummary = forwardRef<HTMLElement, ErrorSummaryProps>(function ErrorSummary(
  { errors, labels },
  ref,
) {
  const names = (Object.keys(labels) as ErrorKey[]).filter((name) => errors[name] !== undefined);
  if (names.length === 0) return null;

  const focusField = (name: ErrorKey) => (event: React.MouseEvent) => {
    event.preventDefault();
    document.getElementById(fieldId(name))?.focus();
  };

  return (
    <section ref={ref} tabIndex={-1} className={styles.summary} aria-labelledby="intake-error-title">
      <h2 id="intake-error-title" className={styles.title}>
        {names.length === 1 ? "One thing to check" : `${names.length} things to check`}
      </h2>
      <ul className={styles.list}>
        {names.map((name) => (
          <li key={name}>
            <a href={`#${fieldId(name)}`} onClick={focusField(name)} className={styles.link}>
              <strong>{labels[name]}:</strong> {errors[name]}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
});
