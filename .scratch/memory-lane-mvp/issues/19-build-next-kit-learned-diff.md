# 19: End & build next Kit: Kit 2 learns from Reactions

Status: ready-for-agent
Blocked by: 18
Slice: 5 Reaction loop (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

This ticket closes the learning loop and completes the golden path. Click 6 (**End & build next Kit**) saves the Session Log, applies the Reactions to the Taste Profile, and builds generation 2 live (with the mock model in E2E). Kit 2 shows:
- a "Learned from last session" diff;
- Cues whose Provenance cites "Because Margaret was Engaged by …";
- at least 30% new Cues.

## Acceptance criteria

- [ ] `applyReactions(profile, entry, kit, now)` follows the PLAN §3.2 rules (FR-21). It returns a new profile.
  - **Engaged:** becomes a Learned Favorite, or adds weight up to 3.
  - **Distressed:** adds the entity and its top-2 tags as Exclusions and removes any matching Learned Favorite. Distressed beats Engaged.
  - **Neutral:** no change.
- [ ] **Click 6** calls `appendSessionLog`, then `applyReactions`, then `setProfile`. It routes to the Kit and requests `generation + 1` with `previousCueIds` from Kit 1. The trace shows "Using 2 Learned Favorites as new Seeds" (FR-22).
- [ ] **Learned Favorites as signals:** they join `signal.interests.entities`. Weights are **[QLOO-GATED]**; the default is ordering plus the 10-ID cap.
- [ ] **Lineage:** `Provenance.seeds[].learned` is true for Learned Favorite contributions. The Cue card shows "Because Margaret was Engaged by X on <date>" (SC-4).
- [ ] **Diff:** `diffKits(prev, next, before, after)` feeds the `LearnedDiffPanel`, which lists Learned Favorites added, Cues removed and Exclusions added (FR-22).
- [ ] **Novelty:** ≥ 30% of Kit 2's Cues are new (`validateKit` step 7).
- [ ] **Golden path, SC-5:** ≤ 7 clicks, met at click 6, with no typing, on the phone, tablet, ipad and desktop projects. After click 6 (SC-4):
  - the diff lists 2 Learned Favorites;
  - ≥ 1 Cue cites a Learned Favorite;
  - ≥ 30% of Cues are new.
- [ ] **Property test, EVALS (k):** for 50 seeded random Reaction sets on Kit 1, Kit 2:
  - never errors;
  - has 0 Distressed recurrences;
  - has ≥ 30% new Cues;
  - cites a Learned Favorite whenever ≥ 1 Engaged was logged.

## Files / modules (PLAN §3.2, §3.6)

- `src/domain/reactions.ts` (`applyReactions`), `src/domain/diffKits.ts`
- `src/features/kit/LearnedDiffPanel.tsx`, `src/features/provenance/Lineage.tsx`
- `src/features/session-mode/EndButton.tsx` (wiring)
- `src/agent/trace.ts` (regeneration labels)

## Tests to write first (TDD)

- `src/domain/reactions.test.ts` (PLAN §10.1, SC-3): every rule, Distressed beating Engaged, the weight cap at 3, the 20-Learned-Favorite cap, and immutability.
- `src/domain/diffKits.test.ts` (new).
- `evals/reactionsProperty.test.ts` (PLAN §10.1, EVALS (k)).
- `e2e/golden.spec.ts` (PLAN §10.1, SC-4 and SC-5): clicks 1-6 on 4 projects.
- Seams: 5 `LanguageModel` (mock), 1 `QlooClient` (fixture), 7 `KeyValueStorage`, 10 clock.

## Comments
