# 24: Without Qloo: the Baseline Kit side by side

Status: ready-for-agent
Blocked by: 21
Slice: 6 Without Qloo + live eval (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

Click 7 of the golden path. **Without Qloo** opens `/p/[storyId]/compare`, which puts the Qloo Kit beside a Baseline Kit written by the same model alone, with no Qloo. Baseline entries are flagged "Not found in Qloo", "Outside 1956-1976" or "On Avoid List". Paired bars show era match and overlap. For the demo, a recorded Baseline appears first, with **Run it live**.

## Acceptance criteria

- [ ] **`composeBaseline(digest, model, signal)`** (PLAN §8.3):
  - Same as the Qloo run: same `MODEL_ID`, temp 0.3, `LLM_PROVIDER_OPTIONS`, digest and instructions.
  - Different from the Qloo run: one call, no tools, no Qloo, no validator.
  - It returns a `BaselineKit` (names and years).
- [ ] **`POST /api/baseline`** with a `BaselineRequest {storyId, digest, mode}` (R7, SC-12):
  - `mode: 'replay'` with a non-demo story → **400**.
  - Live runs use the `baselineLive` bucket (6 per 10 min) plus the daily cap; replays use `baselineReplay` (30 per 10 min).
- [ ] **`POST /api/compare`** takes `{kitEntityIds ≤ 32, baselineItems ≤ 24 (name ≤ 120, year?, domain), birthYear, exclusions}`. It makes ≤ 24 `/search` calls with concurrency 4 and uses the `compare` bucket (10 per 10 min).
- [ ] **`compareKits(q, b, res, original, ex)`** (FR-17, SC-2):
  - **Resolution:** same type, `nameSimilarity` ≥ 0.9, and year ±1 when a year is stated.
  - **Overlap:** shared IDs ÷ Qloo Cues.
  - **Era fit:** measured for film, TV and book against the **original** Window, for both Kits. A missing year or a widened Cue counts as a miss.
  - **Also reported:** the unresolved rate and Avoid List hits.
- [ ] **Compare UI (UX §4.7):**
  - Paired stat bars with direct labels.
  - Two columns, which become ARIA tabs below 1024 px.
  - Flag glyphs and words on Baseline rows.
  - The Baseline column has no Run, Play or Why this? controls, and reads "Written by the model alone, with no Qloo data. Shown only for comparison." It carries the stamp "Comparison only. This Kit can't be run."
- [ ] **Demo:** shows the recorded Baseline first (`pnpm demo:record` now records the Baseline too), with **Run it live**.
- [ ] **States:** a loading skeleton, a Baseline error with Try again, and "Build a Kit first."
- [ ] **Golden path:** click 7 shows the compare view with flagged rows.

## Files / modules (PLAN §3.2, §3.3, §3.4, §8.3)

- `src/agent/composeBaseline.ts`
- `src/app/api/baseline/route.ts`, `src/app/api/compare/route.ts`, `src/server/handlers/baseline.ts`, `src/server/handlers/compare.ts`
- `src/domain/compareKits.ts`, `src/domain/nameSimilarity.ts`
- `src/features/compare/CompareView.tsx`, `StatBars.tsx`, `BaselineColumn.tsx`
- `recordings/demo-margaret/baseline.json`, `scripts/demo-record.ts`

## Tests to write first (TDD)

- `src/domain/compareKits.test.ts` (PLAN §10.1, SC-2): resolution thresholds, overlap, era fit against the original Window (a widened Cue is a miss), and Avoid hits.
- `src/domain/nameSimilarity.test.ts` (new).
- `src/server/routes.test.ts` (PLAN §10.1, SC-12): `/api/baseline` and `/api/compare` return 400, 413 and 429; replay on a non-demo story → 400 (R7). `composeBaseline` passes provider options (recording mock).
- `e2e/golden.spec.ts`: click 7.
- Seams: 5 `LanguageModel`, 1 `QlooClient`, 8 handler factories.

## Comments
