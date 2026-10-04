import type { SeedCandidate } from "@/contracts";
import { DOMAIN_LABEL } from "@/components/ui/domain";

/** "Music", "Film · 1959": what kind of thing a candidate is, in plain words. */
export function candidateKind(candidate: Pick<SeedCandidate, "domain" | "year">): string {
  const label = DOMAIN_LABEL[candidate.domain];
  return candidate.year === undefined ? label : `${label} · ${candidate.year}`;
}
