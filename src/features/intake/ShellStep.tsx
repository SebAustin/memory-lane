import styles from "./Wizard.module.css";

const SHELL_NOTE: Readonly<Record<number, string>> = {
  4: "Choosing favorites arrives in the next update. You will type a few songs, films or places they loved, and we will match each one to the real thing.",
  5: "The Avoid List arrives in the next update. You will list anything that might upset them, and it will be kept out of every Kit.",
  6: "Choosing a stage and reviewing everything arrives in the next update. Your answers so far are saved on this device.",
};

/** Steps 4-6 are wired into the stepper and the URL but not built yet (ticket 04 completes them). */
export function ShellStep({ step }: { step: number }) {
  return (
    <p className={styles.shell}>
      <span className={styles.shellMark} aria-hidden="true">
        Soon
      </span>
      <span>{SHELL_NOTE[step]}</span>
    </p>
  );
}
