"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import type { LifeStoryDraft } from "@/contracts";
import { logEvent } from "@/lib/log";
import type { Repository, StoreStatus } from "@/lib/store/repository";
import { AboutStep } from "./AboutStep";
import { ErrorSummary } from "./ErrorSummary";
import { LivePreview } from "./LivePreview";
import { PlacesStep } from "./PlacesStep";
import { RootsStep } from "./RootsStep";
import { ShellStep } from "./ShellStep";
import { Stepper } from "./Stepper";
import { StepNav } from "./StepNav";
import { StoreNotices } from "./StoreNotices";
import {
  FIELD_LABEL,
  fieldsOfStep,
  firstReachableStep,
  formFromDraft,
  mergeStepValues,
  parseStepFields,
  type DraftValues,
  type FieldErrors,
  type FieldName,
  type FormValues,
} from "./form";
import { STEP_COUNT, stepInfo } from "./steps";
import type { IntakeNav } from "./useIntakeNav";
import styles from "./Wizard.module.css";

export interface WizardBodyProps {
  readonly repository: Repository;
  /** What was saved last time, or null for a fresh start. */
  readonly initialDraft: LifeStoryDraft | null;
  readonly nav: IntakeNav;
  readonly status: StoreStatus;
}

const omit = (errors: FieldErrors, name: FieldName): FieldErrors =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name));

/**
 * The wizard once the store has loaded. The URL says which step to show; the
 * draft says how far the Caregiver may go. Each step is saved when it is left,
 * so a reload (or a closed tab) comes back to the same step with the same answers (A16).
 */
export function WizardBody({ repository, initialDraft, nav, status }: WizardBodyProps) {
  const [saved, setSaved] = useState<DraftValues>(() => initialDraft?.values ?? {});
  const [form, setForm] = useState<FormValues>(() => formFromDraft(initialDraft?.values));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failedSubmits, setFailedSubmits] = useState(0);
  const [welcomeBack, setWelcomeBack] = useState(
    () => initialDraft !== null && Object.keys(initialDraft.values).length > 0,
  );
  const [resumeStep] = useState(() => initialDraft?.step ?? 1);
  const busy = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const step = firstReachableStep(nav.requested ?? resumeStep, saved);
  const info = stepInfo(step);
  const personName = form.firstName.trim();

  const { requested, go } = nav;
  useEffect(() => {
    if (requested !== step) go(step, "replace");
  }, [requested, step, go]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const onChange = (name: FieldName, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => omit(current, name));
  };

  /** Saves what is valid on this step, then moves. Always saves before moving, so a reload cannot lose it. */
  async function leaveTo(target: number | "start", stepValues: DraftValues) {
    if (busy.current) return;
    busy.current = true;
    const values = mergeStepValues(saved, step, stepValues);
    const nextStep = target === "start" ? 1 : target;
    setSaved(values);
    setErrors({});
    setWelcomeBack(false);
    try {
      await repository.saveDraft({ step: nextStep, values, updatedAt: new Date().toISOString() });
    } catch {
      // The store's status already tells the Caregiver (read-only or save failed); the draft stays in memory.
      logEvent({ event: "intake_draft_not_saved", level: "warn", step: nextStep });
    }
    busy.current = false;
    if (target === "start") nav.leave();
    else nav.go(target, "push");
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step === STEP_COUNT) return;
    const parsed = parseStepFields(step, form);
    if (Object.keys(parsed.errors).length > 0) {
      setErrors(parsed.errors);
      setFailedSubmits((count) => count + 1);
      return;
    }
    void leaveTo(step + 1, parsed.values);
  };

  const onBack = () => void leaveTo(step === 1 ? "start" : step - 1, parseStepFields(step, form).values);
  const onSkip = () => void leaveTo(Math.min(step + 1, STEP_COUNT), parseStepFields(step, form).values);

  const stepProps = { form, errors, onChange };
  const summaryLabels = Object.fromEntries(fieldsOfStep(step).map((name) => [name, FIELD_LABEL[name]]));

  return (
    <Container className={styles.wizard}>
      <Stepper step={step} />
      <StoreNotices status={status} />
      <div className={styles.spread}>
        <form className={styles.page} noValidate aria-labelledby="intake-heading" onSubmit={onSubmit}>
          <div key={step} className={styles.turn}>
            <header className={styles.head}>
              <p className={styles.kicker}>Life Story</p>
              <h1 id="intake-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
                {info.heading}
              </h1>
              <p className={styles.lede}>{info.lede}</p>
              {welcomeBack && (
                <p role="status" className={styles.welcome}>
                  Welcome back. Your answers so far are saved on this device.
                </p>
              )}
            </header>
            <ErrorSummary ref={summaryRef} errors={errors} labels={summaryLabels} />
            <div className={styles.fields}>
              {step === 1 && <AboutStep {...stepProps} />}
              {step === 2 && <PlacesStep {...stepProps} />}
              {step === 3 && <RootsStep {...stepProps} />}
              {step > 3 && <ShellStep step={step} />}
            </div>
            <p className={styles.privacy}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
              <span>
                Stays on this device. We never send {personName === "" ? "them" : personName} to anyone.
              </span>
            </p>
          </div>
          <StepNav step={step} personName={personName} onBack={onBack} onSkip={onSkip} />
        </form>
        <div className={styles.previewSlot} data-lead={step === 1}>
          <LivePreview form={form} />
        </div>
      </div>
    </Container>
  );
}
