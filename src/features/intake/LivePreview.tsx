import { ReminiscenceTimeline } from "@/features/kit/ReminiscenceTimeline";
import { previewWindow, type FormValues } from "./form";
import styles from "./LivePreview.module.css";

const FALLBACK_NAME = "This person";

/**
 * The right-hand album page: the Reminiscence Window, drawn and in words, as
 * soon as the birth year is complete (FR-7), plus the facts told so far. The
 * Window line is the only live region, so a screen reader hears it appear once.
 */
export function LivePreview({ form }: { form: FormValues }) {
  const preview = previewWindow(form.birthYear);
  const name = form.firstName.trim() === "" ? FALLBACK_NAME : form.firstName.trim();
  const facts = [
    form.firstName.trim() === "" ? null : form.firstName.trim(),
    preview === null ? null : `Born ${preview.birthYear}`,
    form.hometown.trim() === "" ? null : form.hometown.trim(),
  ].filter((fact): fact is string => fact !== null);

  return (
    <aside className={styles.page} aria-label="Preview">
      <p className={styles.kicker}>Preview</p>
      <p className={styles.window} aria-live="polite" data-ready={preview !== null ? "true" : "false"}>
        {preview === null ? (
          <span className={styles.waiting}>Enter a birth year and the years we will draw from appear here.</span>
        ) : (
          <>
            <span className={styles.term}>Reminiscence Window:</span>{" "}
            <strong className={styles.years}>{preview.window.label}</strong>
          </>
        )}
      </p>
      {preview !== null && (
        <div className={styles.timeline}>
          <ReminiscenceTimeline birthYear={preview.birthYear} window={preview.window} personName={name} />
        </div>
      )}
      {facts.length > 0 && (
        <ul className={styles.facts} aria-label="So far">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
