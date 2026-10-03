# 20: Distressed → Exclusion with undo; demo generation-2 recorded replay

Status: ready-for-agent
Blocked by: 19
Slice: 5 Reaction loop (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

A Distressed Reaction now has a real effect: the Cue and its top-2 tags become Exclusions, so they never come back. Undo reverses it exactly until the next Kit.

The demo also stays safe at generation 2. If live Qloo fails then (≥ 2 domains erroring), the recorded Kit 2 replays after being re-validated against the current Exclusions. Only Learned Favorites that exist in the current Taste Profile get a learned claim; every other claim reads "recorded example" (R6).

## Acceptance criteria

- [ ] **Distressed and undo** (SC-3, FR-21):
  - A Distressed Reaction adds Exclusions with `source: 'reaction'`.
  - Exclusions only grow, except through undo.
  - `revertReaction(profile, reaction)` is the exact inverse.
  - The Distressed banner's **Undo** stays available until the next Kit is built.
- [ ] **Kit 2 after a Distressed:** it never contains the Distressed Cue or its excluded tags. The trace shows "Leaving out Tennessee Waltz and its 2 top tags", using the Cue's name.
- [ ] **`pnpm demo:record`** also records Kit 2, from a scripted run with 2 Engaged Reactions.
- [ ] **When recorded Kit 2 is served (§14.5):**
  - Only on an **upstream** failure (≥ 2 domains erroring) at generation 2.
  - An LLM failure goes to `composeDeterministic`.
  - At generation ≥ 3, `composeDeterministic` runs over the recorded registry.
- [ ] **How recorded Kit 2 is served (R6):**
  - It is validated against the **current** Exclusions.
  - `learned` flags are set only for entities that are Learned Favorites in the current profile.
  - Every other carried-over "Because…" claim is replaced by "Recorded example (not from today's Reactions)".

## Files / modules (PLAN §1, §3.2, §14.5)

- `src/domain/reactions.ts` (`revertReaction`)
- `src/agent/replay.ts` (Kit 2 and R6 flags), `src/server/handlers/kit.ts` (generation-2 trigger)
- `recordings/demo-margaret/kit2.json`, `scripts/demo-record.ts`
- `src/features/session-mode/DistressBanner.tsx` (undo wiring), `src/features/provenance/Lineage.tsx` (recorded example)

## Tests to write first (TDD)

- `src/domain/reactions.test.ts`: `revertReaction` exactly inverts `applyReactions` (property style), and Exclusions never shrink except through undo.
- `src/server/kitStream.test.ts` (PLAN §10.1):
  - a demo generation-2 upstream failure → validated Kit 2 replay with R6 flags;
  - an LLM failure at generation 2 → deterministic, not recorded;
  - generation 3 → deterministic over the recorded registry.
- `src/agent/replay.test.ts`: a recorded Learned Favorite that isn't current → "recorded example".
- `e2e/reactions.spec.ts` (PLAN §10.1, SC-3): Distressed, then build the next Kit; the Cue and its tags are absent. Undo before the build restores the Cue's eligibility.
- Seams: 1 `QlooClient` (faults), 8 handler factories, 11 `consumeKitStream`, 7 `KeyValueStorage`.

## Comments
