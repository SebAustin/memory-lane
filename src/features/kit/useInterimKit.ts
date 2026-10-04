"use client";

import { useCallback, useEffect, useState } from "react";
import { InterimKit, KitRequest, type LifeStory, type TasteProfile } from "@/contracts";
import { toDigest } from "@/domain/digest";
import { profileFromStory } from "@/domain/profile";
import { logEvent } from "@/lib/log";

export type KitLoad =
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly kit: InterimKit }
  | { readonly phase: "failed" };

const ENDPOINT = "/api/kit";
const TIMEOUT_MS = 30_000;

/**
 * Asks `/api/kit` for a saved Life Story's Kit (interim, music only: ticket 15
 * replaces this with the stream). What is sent is built here, on the device:
 * the digest and the Taste Profile, neither of which holds the first name.
 * The answer is checked against the shared contract before it is shown.
 */
export function useInterimKit(story: LifeStory | undefined, profile: TasteProfile | undefined) {
  const [load, setLoad] = useState<KitLoad>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (story === undefined) return;
    const controller = new AbortController();

    async function run(saved: LifeStory) {
      try {
        const body = KitRequest.parse({
          storyId: saved.id,
          digest: toDigest(saved),
          profile: profile ?? profileFromStory(saved),
          generation: 1,
        });
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(TIMEOUT_MS)]),
        });
        const parsed = res.ok ? InterimKit.safeParse(await res.json()) : undefined;
        if (controller.signal.aborted) return;
        if (parsed?.success) {
          setLoad({ phase: "ready", kit: parsed.data });
        } else {
          logEvent({ event: "kit_load_failed", level: "warn", status: res.status });
          setLoad({ phase: "failed" });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        logEvent({ event: "kit_load_failed", level: "warn", error: error instanceof Error ? error.name : "unknown" });
        setLoad({ phase: "failed" });
      }
    }
    void run(story);
    return () => controller.abort();
  }, [story, profile, attempt]);

  const retry = useCallback(() => {
    setLoad({ phase: "loading" });
    setAttempt((count) => count + 1);
  }, []);

  return { load, retry };
}
