# 08: "Why this?" Provenance and "Widen by 3 years"

Status: ready-for-agent
Blocked by: 07
Slice: 2b-ii Provenance + Widen (CORE) · Size: M · Spec: ../spec.md

## What to build

Every Cue card gets **Why this?**. It shows the affinity gauge, the Seed contribution bar and the signal stamps, written as aggregate copy, with a "fixture data" footnote while explainability is synthetic.

When a film, TV or book domain comes back empty, the Caregiver can press **Widen by 3 years**. Cues found that way are stamped "Just outside 1956-1976".

Sessions don't exist yet. Widening re-runs that domain's fetch and re-renders its Cues. The §14.2 rule that other Sessions stay unchanged is completed in ticket 11, once Sessions exist.

## Acceptance criteria

- [ ] Every Cue has a **Why this?** control. It opens as an anchored popover at ≥ 768 px and a bottom sheet below that. Esc closes it and returns focus (SC-6, FR-16). It shows:
  - the affinity gauge: a `<meter>` with a word band ("It describes groups, not Margaret.");
  - the Seed contribution bar from `explainability`, with direct labels and hatching;
  - signal stamps: Age 55+, Hometown, Window, and a theme stamp when `themeTag` is set. Signals that don't apply are dashed, with a reason;
  - "Signals only" when no Seed contributed;
  - "Fixture data: scores are illustrative until live Qloo data arrives" when `provenance.synthetic` is set.
- [ ] Copy is aggregate only: "People who share Margaret's era and favorites often loved this." Colour never carries meaning alone (NFR-1).
- [ ] **Empty domains:** an empty film, TV or book domain shows "No books turned up for 1956 to 1976. [Widen by 3 years] [Add a Seed]" (FR-24).
- [ ] **Widen rules:**
  - Only the Caregiver can widen, and only once per domain. It never happens automatically (R2).
  - Widen resends with `widen: ['book']` at the **same** `generation` with `previousCueIds: []` (§14.2), and counts against the `kitLive` bucket.
- [ ] **Window logic:** `effectiveWindow(w, widened)` applies ±3 only to the widened domain. Cues inside the effective Window but outside the original are marked `outsideWindow: true` and stamped "Just outside 1956-1976". From ticket 10 the validator becomes the authority for this flag.
- [ ] **Params snapshot:** a widened domain uses the effective Window, other domains are unchanged, and every call still carries the Exclusions (SC-3).
- [ ] The trace shows "Widening films to 1953-1979 as you asked. Cues outside 1956-1976 are marked."

## Files / modules (PLAN §3.2, §3.6)

- `src/domain/window.ts` (`effectiveWindow`)
- `src/features/provenance/WhyThis.tsx`, `AffinityGauge.tsx`, `SeedBar.tsx`, `SignalStamps.tsx`
- `src/features/kit/WidenCta.tsx`, `src/features/kit/CueCard.tsx` (stamps)
- `src/agent/provenance.ts` (new; builds `Provenance` from the envelope and later reused by `hydrateKit`)
- `src/agent/trace.ts` (widen label)

## Tests to write first (TDD)

- `src/features/provenance/whyThis.test.tsx` (PLAN §10.1, SC-6): every Cue exposes the affinity and at least one Seed or signal, "Signals only" shows with no Seeds, and the fixture-data footnote shows when synthetic. This needs a DOM test environment; add `jsdom` and `@testing-library/react` as dev dependencies (not in the PLAN §0 list, so note the addition).
- `src/domain/window.test.ts`: `effectiveWindow` is ±3 and has no effect when not widened.
- `src/qloo/params.test.ts`: widen cases (SC-3).
- `e2e/widen.spec.ts` (new; PLAN §8.1 "Widen CTA → stamped Cues", EVALS (b)): an empty book domain shows the CTA, and after clicking it the stamped Cues appear.
- Seams: 1 `QlooClient`, 8 handler factories.

## Comments
