import "server-only";
import type { Cue } from "@/contracts";
import { margaretKitRequest } from "@/demo/margaret";
import { logEvent } from "@/lib/log";
import { getKitDeps } from "@/server/deps";
import { buildInterimKit, type InterimKit } from "./buildInterimKit";

/** Margaret's interim Kit, built through the same core as `POST /api/kit`. Throws on a bad environment. */
export function loadDemoKit(): Promise<InterimKit> {
  return buildInterimKit(margaretKitRequest(), getKitDeps());
}

/**
 * A few real Cues for the landing page (ADR 0003: nothing shown as a Qloo pick
 * is invented). Landing must never break on a data problem, so any failure
 * yields no samples and the page leaves that section out.
 */
export async function loadDemoSampleCues(count: number): Promise<readonly Cue[]> {
  try {
    return (await loadDemoKit()).cues.slice(0, count);
  } catch (error) {
    logEvent({
      event: "landing.samples_unavailable",
      level: "warn",
      error: error instanceof Error ? error.name : "unknown",
    });
    return [];
  }
}
