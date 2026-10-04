import { PrimaryButton, SecondaryButton } from "@/components/site/MessagePage";
import { STEP_COUNT, stepInfo } from "./steps";
import styles from "./Wizard.module.css";

export interface StepNavProps {
  readonly step: number;
  /** The first name typed so far ("" if none). Used on the last step, where the Kit is named after the Person. */
  readonly personName: string;
  /** The Life Story is being saved and its Kit opened. */
  readonly building: boolean;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

/**
 * Back on every step, Skip on optional ones (FR-3), and Next. Back and Skip
 * save what is valid and move on; Next checks the step first. The last step
 * builds the Kit instead of moving on.
 */
export function StepNav({ step, personName, building, onBack, onSkip }: StepNavProps) {
  const isLast = step === STEP_COUNT;
  return (
    <div className={styles.nav}>
      <SecondaryButton onClick={onBack} disabled={building}>
        Back
      </SecondaryButton>
      <div className={styles.navEnd}>
        {stepInfo(step).optional && <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>}
        {isLast ? (
          <PrimaryButton type="submit" disabled={building} aria-busy={building}>
            {building ? "Building\u2026" : personName === "" ? "Build the Kit" : <>Build {personName}&rsquo;s Kit</>}
          </PrimaryButton>
        ) : (
          <PrimaryButton type="submit">Next</PrimaryButton>
        )}
      </div>
    </div>
  );
}
