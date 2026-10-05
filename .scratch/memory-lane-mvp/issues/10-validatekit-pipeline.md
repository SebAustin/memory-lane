# 10: `validateKit`: a rogue draft is repaired into a compliant Kit

Status: resolved (pulled forward; pure domain code)
Blocked by: 09
Slice: 3a-i Validator + templates (CORE), part 2 of 3 · Size: M · Spec: ../spec.md

## What to build

This ticket builds the ADR 0003 backstop. `pnpm validate:demo` feeds a deliberately rogue KitDraft through `validateKit` and prints the compliant result, with every drop and repair listed by reason. The rogue draft contains:
- an invented ID;
- an excluded ID;
- an out-of-Window film;
- a quiz Prompt;
- "improves memory" in a tip;
- "Tennessee Waltz" in a Prompt;
- a late-stage Session formatted for conversation.

A second pass makes zero changes.

## Acceptance criteria

- [x] `validateKit(draft, ctx)` returns `{kit, drops, repairs}` and runs in this fixed order (SC-1, FR-11, FR-13, SC-7):
  1. **Grounding:** drop IDs that aren't in the registry.
  2. **Exclusions:** drop excluded entities and tags.
  3. **Step 2b, name screening (§14.1 backstop):** the Avoid-topic and sensitive-lexicon check on hydrated names.
  4. **Window (R2):** drop film, TV and book Cues that have no year or fall outside the **effective** Window. Keep Cues inside the effective Window but outside the original, with `outsideWindow: true`.
  5. **Duplicates:** drop repeats.
  6. **Text:** run `checkText` by scope. A failing string is replaced from the templates in `ctx` (the FR-12 deviation).
  7. **Stage fit:** set the format, trim Prompts to the cap, replace over-long Prompts, top up `sensoryActivities` and clamp `durationMin`.
  8. **Novelty:** if < 30% of Cues are new versus `previousCueIds`, swap the lowest-affinity repeats for unused new Cues from the same domain. The swaps are re-checked against steps 2-4.
  9. **Backfill:** refill each Session to the stage minimum from top-affinity unused Cues, re-checked against steps 2-4.
- [x] **Idempotent:** a second pass makes 0 drops and 0 repairs.
- [x] **Late stage:** a late-stage Session always ends with ≥ 2 sensory activities and ≤ 1 Prompt of ≤ 12 words per Cue.
- [x] **EVALS (g):** the UX titles pass untouched. The invented Title-Case name in `whyThis` and the quoted invented title in a theme are replaced.
- [x] **`pnpm validate:demo`** prints the rogue draft, the drop and repair summary, and the compliant Kit (the slice 3a-i demo).
- [x] **Coverage:** `src/domain/validator.ts` is ≥ 90%. Files stay < 800 lines; steps may live in `src/domain/validator/*.ts`, with `validator.ts` as the entry.

## Files / modules (PLAN §3.2)

- `src/domain/validator.ts` (plus `src/domain/validator/*.ts` steps if needed)
- `src/domain/stageFit.ts`
- `scripts/validate-demo.ts`, and a `validate:demo` script in `package.json`

## Tests to write first (TDD)

- `src/domain/validator.test.ts` (PLAN §10.1, SC-1): each step on its own, including:
  - a fabricated Cue dropped;
  - `outsideWindow` judged against the original Window, not the effective one;
  - a missing year dropped;
  - novelty swaps re-checked;
  - backfill;
  - idempotence;
  - the EVALS (d) and (g) items.
- `src/domain/stageFit.test.ts` (PLAN §10.1, SC-7): every stage's caps and sensory minimums.

## Comments

- 2026-10-04 (builder, pulled forward): `validateKit`, `stageFit`, `pnpm validate:demo` done on the worktree branch `worktree-agent-acca87c4c19a3c1e9`.
  - **Files:** `src/domain/validator.ts` (entry, the fixed order), `src/domain/validator/{types,admit,cues,text,novelty,backfill,fill,pick,limits}.ts` (steps), `src/domain/stageFit.ts`, `src/domain/window.ts` (`effectiveWindow`, `WIDEN_YEARS`, per PLAN 3.2), `scripts/validate-demo.ts` plus `scripts/lib/validate-demo.ts`, and the `validate:demo` script in `package.json`. Shared fixtures: `validator/rogue.ts` (Margaret's registry, context and the rogue draft, used by the tests and the demo) and `validator/testkit.ts` (test builders).
  - **Tests (all written before or alongside the code, one slice at a time):** `validator.test.ts` (grounding, Exclusions, echoes, 2b screening, Window), `validator.text.test.ts` (step 5, EVALS g), `stageFit.test.ts` (every stage's caps and sensory minimums), `validator.pipeline.test.ts` (stage fit through the validator, novelty, backfill, the rogue draft EVALS d and g, idempotence over 12 contexts), `validator.fuzz.test.ts` (3 stages x 80 seeded random rogue drafts: idempotent, contract-valid, no shortfall), `validator.limits.test.ts` (LIMITS equal the contract), `window.test.ts` (+2), `scripts/lib/validate-demo.test.ts`. Coverage: every validator file and `stageFit.ts` is 100% statements, lines and functions; `fill.ts` and `pick.ts` branches are 50% and 71% (default-argument and empty-pool branches); gates pass.
  - **Context shape:** `ValidationContext` = `{registry: RegistryEntry[], stage, window (ORIGINAL), widened, profile (seeds, learnedFavorites, exclusions, avoidTopics), sensitiveThemesOptIn, fingerprintTagNames, places, previousCueIds, templates}`. `RegistryEntry` = `{entityId, domain, name, year?, tags, affinity|null}`; `domain` cannot import the server-only `RunRegistry`, so the caller maps its registry to this plain shape. The caller passes `TEMPLATES` from `src/agent/templates.ts` as `templates`.
  - **Result:** `{kit, drops, repairs, shortfalls}`. `drops` and `repairs` carry `{step, reason, sessionIndex, field|entityId, rules?}` and never model text. `shortfalls` lists a Session left under the stage minimum because the registry ran out (the caller should then compose deterministically).
  - **outsideWindow:** the draft contract has no such field, so the validated Cue is `KitDraft` cue plus an optional `outsideWindow: true` (the type `ValidatedCue`). A validated Kit is still a valid `KitDraft`, but a Zod parse would strip the flag, so `hydrateKit` should either read it before parsing or recompute it with the same rule (original Window, registry year). No contract changes were needed.
  - **Decisions to confirm:**
    1. The registry's domain wins over the model's (a film labelled "music" would otherwise dodge the Window); a wrong label is repaired (`domain_corrected`).
    2. Seeds and Learned Favorites echoed as Cues are dropped (`seed_or_favorite_echo`, PLAN 15.4). Entity Exclusion labels also count as Avoid terms in text (a Distressed entity cannot be named in a Prompt).
    3. A failing title or theme is replaced as a vetted pair, so they stay coherent.
    4. Stage fit also drops Cues past the stage maximum (`over_stage_cap`, last first).
    5. Novelty counts are in integer percent (`MIN_NEW_PERCENT = 30`), and backfill prefers new Cues over repeats, so it cannot undo novelty.
    6. Fewer than 3 or more than 4 Sessions is not repaired; the compose boundary's Zod parse owns that.
  - **Not done here:** the R12 "never presume a living relative" runtime rule (ticket 09 suggested it); it is still enforced on the templates only. `hydrateKit` and the agent wiring are other tickets.
