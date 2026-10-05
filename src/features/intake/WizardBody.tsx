"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import { LifeStory, type LifeStoryDraft } from "@/contracts";
import { profileFromStory } from "@/domain/profile";
import { StoreBanner } from "@/features/your-data/StoreBanner";
import { newStoryId } from "@/lib/id";
import { logEvent } from "@/lib/log";
import { ReadOnlyStoreError, type Repository } from "@/lib/store/repository";
import { AboutStep } from "./AboutStep";
import { ErrorSummary } from "./ErrorSummary";
import { LaterSteps } from "./LaterSteps";
import { LivePreview } from "./LivePreview";
import { PlacesStep } from "./PlacesStep";
import { RootsStep } from "./RootsStep";
import { Stepper } from "./Stepper";
import { StepNav } from "./StepNav";
import {
  ERROR_LABEL,
  errorKeysOfStep,
  firstReachableStep,
  formFromDraft,
  mergeStepValues,
  parseStepFields,
  validateLaterStep,
  type DraftValues,
  type FieldErrors,
  type FieldName,
  type FormValues,
  type PendingText,
} from "./form";
import { createFetchResolver, type Resolver } from "./resolver";
import { STEP_COUNT, stepInfo } from "./steps";
import type { IntakeNav } from "./useIntakeNav";
import styles from "./Wizard.module.css";

/** `StoreV1.lifeStories` holds at most this many (several Life Stories arrive with ticket 27). */
const MAX_LIFE_STORIES = 10;

/** Which step to send the Caregiver back to for a part of the Life Story that is missing or wrong. */
function stepOfIssue(field: PropertyKey | undefined): number {
  switch (field) {
    case "firstName":
    case "birthYear":
      return 1;
    case "hometown":
    case "youngAdultCity":
    case "careLocation":
      return 2;
    case "heritage":
    case "language":
    case "occupation":
      return 3;
    case "seeds":
      return 4;
    case "avoidList":
      return 5;
    default:
      return 6;
  }
}

const resolverForBrowser = createFetchResolver();

export interface WizardBodyProps {
  readonly repository: Repository;
  /** What was saved last time, or null for a fresh start. */
  readonly initialDraft: LifeStoryDraft | null;
  readonly nav: IntakeNav;
  /** How favorites and Avoid topics are looked up in Qloo. Defaults to `/api/resolve`. */
  readonly resolver?: Resolver;
}

const omit = (errors: FieldErrors, name: FieldName): FieldErrors =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name));

/**
 * The wizard once the store has loaded. The URL says which step to show; the
 * draft says how far the Caregiver may go. Each step is saved when it is left,
 * so a reload (or a closed tab) comes back to the same step with the same answers (A16).
 */
export function WizardBody({ repository, initialDraft, nav, resolver = resolverForBrowser }: WizardBodyProps) {
  const [saved, setSaved] = useState<DraftValues>(() => initialDraft?.values ?? {});
  const savedRef = useRef<DraftValues>(saved);
  const [form, setForm] = useState<FormValues>(() => formFromDraft(initialDraft?.values));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failedSubmits, setFailedSubmits] = useState(0);
  const [building, setBuilding] = useState(false);
  const [buildProblem, setBuildProblem] = useState<string | null>(null);
  const [welcomeBack, setWelcomeBack] = useState(
    () => initialDraft !== null && Object.keys(initialDraft.values).length > 0,
  );
  const [resumeStep] = useState(() => initialDraft?.step ?? 1);
  const busy = useRef(false);
  const pending = useRef<PendingText>({});
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

  /** Keeps what the Caregiver has confirmed on this step, and saves it as they go. */
  const commit = useCallback((values: DraftValues) => {
    savedRef.current = values;
    setSaved(values);
  }, []);

  const updateValues = (patch: Partial<DraftValues>) => {
    const values = { ...savedRef.current, ...patch };
    commit(values);
    setErrors({});
    setBuildProblem(null);
    repository
      .saveDraft({ step, values, updatedAt: new Date().toISOString() })
      .catch(() => logEvent({ event: "intake_draft_not_saved", level: "warn", step }));
  };

  const reportPending = (key: keyof PendingText, text: string) => {
    pending.current = { ...pending.current, [key]: text };
  };

  /** Saves what is valid on this step, then moves. Always saves before moving, so a reload cannot lose it. */
  async function leaveTo(target: number | "start", stepValues: DraftValues) {
    if (busy.current) return;
    busy.current = true;
    const values = mergeStepValues(savedRef.current, step, stepValues);
    const nextStep = target === "start" ? 1 : target;
    commit(values);
    pending.current = {};
    setErrors({});
    setBuildProblem(null);
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

  function failWith(found: FieldErrors) {
    setErrors(found);
    setFailedSubmits((count) => count + 1);
  }

  /** The last step: put the Life Story together, keep it on this device, and open its Kit. */
  async function build() {
    if (busy.current) return;
    const missing = validateLaterStep(STEP_COUNT, savedRef.current, pending.current);
    if (Object.keys(missing).length > 0) return failWith(missing);

    const story = LifeStory.safeParse({
      avoidList: [], // the Avoid List is optional, so a Caregiver who skipped it has none
      ...savedRef.current,
      id: newStoryId(),
      createdAt: new Date().toISOString(),
    });
    if (!story.success) {
      const field = story.error.issues[0]?.path[0];
      logEvent({ event: "intake_story_invalid", level: "warn", field: typeof field === "string" ? field : "unknown" });
      setBuildProblem("Something in the answers needs another look. We have taken you to the step to check.");
      void leaveTo(stepOfIssue(field), {});
      return;
    }
    if (repository.getState().lifeStories.length >= MAX_LIFE_STORIES) {
      setBuildProblem("This device already holds 10 Life Stories. Delete one before adding another.");
      return;
    }

    busy.current = true;
    setBuilding(true);
    setBuildProblem(null);
    try {
      await repository.saveLifeStory(story.data);
      await repository.setProfile(story.data.id, profileFromStory(story.data));
      await repository.saveDraft(null);
    } catch (error) {
      if (error instanceof ReadOnlyStoreError) {
        busy.current = false;
        setBuilding(false);
        setBuildProblem("This device holds Life Stories from a newer version of Memory Lane, so nothing new can be saved here.");
        return;
      }
      // The change is kept in memory and the status says so; the Kit can still open in this tab.
      logEvent({ event: "intake_story_not_saved", level: "warn" });
    }
    nav.openKit(story.data.id);
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step === STEP_COUNT) {
      void build();
      return;
    }
    if (step > 3) {
      const found = validateLaterStep(step, savedRef.current, pending.current);
      if (Object.keys(found).length > 0) return failWith(found);
      void leaveTo(step + 1, {});
      return;
    }
    const parsed = parseStepFields(step, form);
    if (Object.keys(parsed.errors).length > 0) return failWith(parsed.errors);
    void leaveTo(step + 1, parsed.values);
  };

  const onBack = () => void leaveTo(step === 1 ? "start" : step - 1, parseStepFields(step, form).values);
  const onSkip = () => void leaveTo(Math.min(step + 1, STEP_COUNT), parseStepFields(step, form).values);

  const stepProps = { form, errors, onChange };
  const summaryLabels = Object.fromEntries(errorKeysOfStep(step).map((key) => [key, ERROR_LABEL[key]]));

  return (
    <Container className={styles.wizard}>
      <Stepper step={step} />
      <StoreBanner />
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
              {step > 3 && (
                <LaterSteps
                  step={step}
                  values={saved}
                  firstName={personName}
                  resolver={resolver}
                  errors={errors}
                  onValues={updateValues}
                  onPending={reportPending}
                  onEdit={(target) => void leaveTo(target, {})}
                />
              )}
            </div>
            <p className={styles.privacy}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
              <span>
                Stays on this device. We never send {personName === "" ? "them" : personName} to anyone.{" "}
                <Link href="/about#privacy" className={styles.privacyLink}>
                  Export or delete it any time.
                </Link>
              </span>
            </p>
          </div>
          {buildProblem !== null && (
            <p role="alert" className={styles.notice}>
              {buildProblem}
            </p>
          )}
          <StepNav step={step} personName={personName} building={building} onBack={onBack} onSkip={onSkip} />
        </form>
        <div className={styles.previewSlot} data-lead={step === 1}>
          <LivePreview form={form} />
        </div>
      </div>
    </Container>
  );
}
