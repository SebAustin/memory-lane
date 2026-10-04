import { STEPS, STEP_COUNT, stepInfo } from "./steps";
import styles from "./Stepper.module.css";

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
  );
}

/**
 * "Step 2 of 6" drawn as a stitched thread (UX section 3): a dashed line that
 * turns to solid thread as steps are finished. The words carry the meaning;
 * the thread, the check marks and the ring only back them up.
 */
export function Stepper({ step }: { step: number }) {
  return (
    <nav aria-label="Life Story progress" className={styles.stepper}>
      <p className={styles.count}>
        <span>
          Step {step} of {STEP_COUNT}
        </span>
        <span className={styles.name}>{stepInfo(step).label}</span>
      </p>
      <ol className={styles.thread}>
        {STEPS.map(({ n, label }) => {
          const state = n < step ? "done" : n === step ? "current" : "upcoming";
          return (
            <li key={n} className={styles.item} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <span className={styles.dot} aria-hidden="true">
                {state === "done" ? <Check /> : n}
              </span>
              <span className={styles.label}>
                {label}
                <span className="visually-hidden">{state === "done" ? " (done)" : state === "current" ? " (current step)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
