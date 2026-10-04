"use client";

import { Container } from "@/components/ui/Container";
import { useRepository, useStore, useStoreStatus } from "@/lib/store/useStore";
import { Stepper } from "./Stepper";
import { WizardBody } from "./WizardBody";
import { useIntakeNav } from "./useIntakeNav";
import styles from "./Wizard.module.css";

/**
 * `/intake`: waits for the local store to load (so the first thing on screen is
 * the Caregiver's own draft, not a blank form that jumps), then hands over to
 * the wizard. The server renders the waiting state, which is also what a
 * browser without JavaScript sees.
 */
export function IntakeWizard() {
  const repository = useRepository();
  const status = useStoreStatus();
  const draft = useStore((state) => state.draft);
  const nav = useIntakeNav();

  if (status.phase === "loading") {
    return (
      <Container className={styles.wizard}>
        <Stepper step={nav.requested ?? 1} />
        <div className={styles.waiting} aria-busy="true">
          <h1 className={styles.heading}>Start a Life Story</h1>
          <p role="status" className={styles.lede}>
            Opening your draft&hellip;
          </p>
        </div>
      </Container>
    );
  }
  return <WizardBody repository={repository} initialDraft={draft} nav={nav} status={status} />;
}
