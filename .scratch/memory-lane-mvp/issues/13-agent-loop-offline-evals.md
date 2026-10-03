# 13: Agent loop composes a themed Kit; offline evals run in CI

Status: ready-for-agent
Blocked by: 12
Slice: 3a-ii Agent loop + evals (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

`pnpm kit:cli P1` prints a themed Kit built by the Claude agent. Its trace shows the server prefetch lines, then the agent "Looking deeper" lines, then the validator. Any model failure falls back to the deterministic Kit from the same prefetch.

`pnpm eval:offline` runs the EVALS scenarios on every PR with a scripted model and the fixture client. One real Gateway call confirms that zero data retention and prompt caching work.

## Acceptance criteria

- [ ] `composeKit(req, {client, model, emit, signal, now})` (R9, SC-13):
  - **Setup:** `new ToolLoopAgent({model, instructions: SYSTEM_PROMPT, tools, temperature: 0.3, maxOutputTokens: 6000, providerOptions: LLM_PROVIDER_OPTIONS})`, called with `agent.generate({prompt: renderDigest(d) + compactRegistry(pre), abortSignal})`.
  - **Stop conditions:** `stopWhen: [composeAccepted, composeFailedTwice, isStepCount(5)]`.
  - **Forcing compose:** from zero-based `stepNumber ≥ 2`, `prepareStep` returns `{activeTools: ['compose_kit'], toolChoice: {type: 'tool', toolName: 'compose_kit'}}`.
  - **Abort:** `AbortSignal.any([request.signal, AbortSignal.timeout(90_000)])`.
  - **Fallback to `composeDeterministic(pre)`** on no accepted compose, two compose errors, abort, or a Gateway error after 1 retry. The trace shows "Building a simple Kit from the same Qloo Cues".
- [ ] `getModel(cfg)` returns the Gateway model (`anthropic/claude-sonnet-5.5`), the mock (refused when `VERCEL_ENV` is set), or `null` for `off`.
- [ ] Every LLM call site passes `LLM_PROVIDER_OPTIONS`, asserted with the recording mock (A30).
- [ ] `pnpm eval:offline` (`evals/offline.test.ts`) runs EVALS §3 scenarios (c), (d), (e), (g), (h) and (j) on P1-P6, using `MockLanguageModelV4` scripted tool calls and `FixtureQlooClient`. It runs in CI. Gates:
  - 100% post-validator grounding;
  - 0 Exclusion breaches;
  - no `ML-CANARY-7f3a` in any output;
  - text replacement rate < 15% on scripted realistic drafts.
- [ ] `pnpm kit:cli P1` prints the Kit and the trace, including an `expand_theme` line (the slice 3a-ii demo).
- [ ] **Live Gateway check (R13, A25):** with `AI_GATEWAY_API_KEY` set locally, one call with `LLM_PROVIDER_OPTIONS` succeeds, and `cachedInputTokens > 0` on a step ≥ 1. Record the outcome under Comments. If ZDR has no route, turn ZDR off, keep training disallowed, and document the gap.
- [ ] Per-request log fields: model steps, `compose_kit` errors, tokens (input / cached / output), `fallback` and `aborted` (PLAN §9).

## Files / modules (PLAN §3.3, §8.1)

- `src/agent/composeKit.ts`, `src/agent/model.ts`
- `evals/offline.test.ts`, `evals/personas.ts`, `evals/scripts/*.ts` (scripted model runs)
- `scripts/kit-cli.ts`, and the `kit:cli` and `eval:offline` scripts in `package.json`; CI job update

## Tests to write first (TDD)

- `src/agent/composeKit.test.ts` (PLAN §10.1, SC-13):
  - a happy path where the expand → compose run is accepted;
  - `stepNumber ≥ 2` forces compose;
  - 2 compose errors → deterministic;
  - the mock throwing at step 0 → deterministic;
  - the mock never composing → deterministic;
  - abort → deterministic;
  - provider options on every call.
- `evals/offline.test.ts` (PLAN §10.1, SC-1): the scenarios listed above. EVALS (h) yields a 100% grounded deterministic Kit in each of its four failure modes.
- Seams: 5 `LanguageModel` (`MockLanguageModelV4` + recording spy), 1 `QlooClient`, 6 `StreamEmitter`, 10 clock.

## Comments
