"use client";

import { useCallback, useRef, useState } from "react";
import type { SeedCandidate } from "@/contracts";
import type { EntityOutcome, Resolver } from "./resolver";

/** Where a lookup stands, as the Caregiver sees it (UX section 3, FR-4). */
export type Lookup =
  | { readonly phase: "idle" }
  | { readonly phase: "searching"; readonly query: string }
  | { readonly phase: "confirm"; readonly query: string; readonly candidate: SeedCandidate }
  | { readonly phase: "choose"; readonly query: string; readonly candidates: readonly SeedCandidate[] }
  | { readonly phase: "none"; readonly query: string; readonly hint?: string }
  | { readonly phase: "unreachable"; readonly query: string }
  | { readonly phase: "busy"; readonly query: string; readonly retryAfterSec: number }
  | { readonly phase: "invalid" };

function lookupFor(query: string, outcome: EntityOutcome): Lookup {
  switch (outcome.kind) {
    case "match":
      return { phase: "confirm", query, candidate: outcome.candidate };
    case "choose":
      return { phase: "choose", query, candidates: outcome.candidates };
    case "none":
      return { phase: "none", query, ...(outcome.hint === undefined ? {} : { hint: outcome.hint }) };
    case "unreachable":
      return { phase: "unreachable", query };
    case "busy":
      return { phase: "busy", query, retryAfterSec: outcome.retryAfterSec };
    case "invalid":
      return { phase: "invalid" };
  }
}

/**
 * One entity lookup at a time. The newest request wins: an answer that arrives
 * after the Caregiver has typed something else, or cleared the box, is dropped.
 */
export function useEntityLookup(resolver: Resolver, firstName: string) {
  const [lookup, setLookup] = useState<Lookup>({ phase: "idle" });
  const latest = useRef(0);

  const find = useCallback(
    async (query: string) => {
      latest.current += 1;
      const mine = latest.current;
      const text = query.trim();
      if (text === "") {
        setLookup({ phase: "invalid" });
        return;
      }
      setLookup({ phase: "searching", query: text });
      const outcome = await resolver.entity(text, { firstName });
      if (mine === latest.current) setLookup(lookupFor(text, outcome));
    },
    [resolver, firstName],
  );

  const reset = useCallback(() => {
    latest.current += 1;
    setLookup({ phase: "idle" });
  }, []);

  return { lookup, find, reset };
}
