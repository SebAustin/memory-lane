# 25: Live eval and the cross-family judge

Status: ready-for-agent
Blocked by: 24
Slice: 6 Without Qloo + live eval (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

`pnpm eval:live` runs 5 personas × 3 Kits, plus the Baseline, through the real Gateway, and scores them with the EVALS §3 metrics. It writes `evals/results/<date>.json` and a markdown table. Prompt quality is scored by a calibrated judge from a different model family (`openai/gpt-5.6-sol`).

This ticket finishes CORE build work; check-in follows.

## Acceptance criteria

- [ ] **`pnpm eval:live`** (about $3) computes every metric in the EVALS §3 table:
  - grounding (raw and post-validator), era fit, Exclusion compliance;
  - Prompt quality, stage fit, text replacement rate;
  - agent Qloo use, coverage;
  - Baseline overlap and hallucination, the Reaction loop;
  - latency p50/p95, and cost.
- [ ] Before ticket 23 it runs with `QLOO_MODE=fixture`, and its numbers are labelled provisional (A20). After ticket 23, re-run it live.
- [ ] **Judge** (`openai/gpt-5.6-sol`) uses an anchored 1-5 rubric: open, failure-free, no recall test, no claims, fits the stage, aggregate.
  - **Temperature probe (R10):** call it with `temperature: 0` and inspect the result warnings. If the setting is ignored or rejected, score each Prompt 3 times and use the **median**.
- [ ] **Calibration:** the judge's scores count only after ≥ 80% agreement within ±1 on 20 hand-labelled Prompts (`evals/judge/calibration.json`). **Human gate:** the agent drafts the labels and the user reviews them at check-in.
- [ ] Every judge call passes `LLM_PROVIDER_OPTIONS`.
- [ ] The release-gate summary shows: hard gates green offline, live thresholds met on ≥ 4 of 5 personas, and any miss listed for Known Limitations.
- [ ] The SC-2 numbers are recorded: era fit ≥ 90%, overlap ≤ 60% (floor) with a target < 25%.

## Files / modules (PLAN §8.3, EVALS §3)

- `evals/live.ts`, `evals/metrics.ts`, `evals/judge/judge.ts`, `evals/judge/rubric.ts`, `evals/judge/calibration.json`
- `evals/results/` (output)
- The `eval:live` script in `package.json`

## Tests to write first (TDD)

- `evals/judge/judge.test.ts` (new), with `MockLanguageModelV4`. Cover:
  - a warning about ignored temperature → the median of 3;
  - a clean call → a single run;
  - provider options present;
  - the calibration agreement computed correctly.
- `evals/metrics.test.ts` (new): each metric on small hand-built inputs.
- Seams: 5 `LanguageModel`, 1 `QlooClient`, 10 clock.

## Comments
