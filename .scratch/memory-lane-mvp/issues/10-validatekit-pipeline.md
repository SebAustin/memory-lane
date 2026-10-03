# 10: `validateKit`: a rogue draft is repaired into a compliant Kit

Status: ready-for-agent
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

- [ ] `validateKit(draft, ctx)` returns `{kit, drops, repairs}` and runs in this fixed order (SC-1, FR-11, FR-13, SC-7):
  1. **Grounding:** drop IDs that aren't in the registry.
  2. **Exclusions:** drop excluded entities and tags.
  3. **Step 2b, name screening (§14.1 backstop):** the Avoid-topic and sensitive-lexicon check on hydrated names.
  4. **Window (R2):** drop film, TV and book Cues that have no year or fall outside the **effective** Window. Keep Cues inside the effective Window but outside the original, with `outsideWindow: true`.
  5. **Duplicates:** drop repeats.
  6. **Text:** run `checkText` by scope. A failing string is replaced from the templates in `ctx` (the FR-12 deviation).
  7. **Stage fit:** set the format, trim Prompts to the cap, replace over-long Prompts, top up `sensoryActivities` and clamp `durationMin`.
  8. **Novelty:** if < 30% of Cues are new versus `previousCueIds`, swap the lowest-affinity repeats for unused new Cues from the same domain. The swaps are re-checked against steps 2-4.
  9. **Backfill:** refill each Session to the stage minimum from top-affinity unused Cues, re-checked against steps 2-4.
- [ ] **Idempotent:** a second pass makes 0 drops and 0 repairs.
- [ ] **Late stage:** a late-stage Session always ends with ≥ 2 sensory activities and ≤ 1 Prompt of ≤ 12 words per Cue.
- [ ] **EVALS (g):** the UX titles pass untouched. The invented Title-Case name in `whyThis` and the quoted invented title in a theme are replaced.
- [ ] **`pnpm validate:demo`** prints the rogue draft, the drop and repair summary, and the compliant Kit (the slice 3a-i demo).
- [ ] **Coverage:** `src/domain/validator.ts` is ≥ 90%. Files stay < 800 lines; steps may live in `src/domain/validator/*.ts`, with `validator.ts` as the entry.

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
