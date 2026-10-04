"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parseStepParam } from "./form";

export interface IntakeNav {
  /** The step in the URL, or null when `?step=` is missing or not 1-6. */
  readonly requested: number | null;
  /** Moves to a step. `push` adds a history entry (Back works); `replace` fixes the URL in place. */
  go(step: number, mode: "push" | "replace"): void;
  /** Leaves the wizard for the landing page. */
  leave(): void;
}

/**
 * Keeps the step in the URL (`/intake?step=3`) so reload and the browser's Back
 * button work. Uses the native History API, which Next keeps in step with
 * `useSearchParams`, so a step change is instant and needs no server round trip.
 */
export function useIntakeNav(): IntakeNav {
  const params = useSearchParams();
  const router = useRouter();
  const go = useCallback((step: number, mode: "push" | "replace") => {
    const url = `/intake?step=${step}`;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);
  const leave = useCallback(() => router.push("/"), [router]);
  return { requested: parseStepParam(params.get("step")), go, leave };
}
