# 11: Simple Kit: deterministic Sessions render in the Kit view

Status: ready-for-agent
Blocked by: 10
Slice: 3a-i Validator + templates (CORE), part 3 of 3 · Size: M · Spec: ../spec.md

## What to build

Margaret's Kit page becomes a real Kit: an album spread of 3-4 themed Sessions built with no LLM. The server runs prefetch → `composeDeterministic` → `validateKit` → `hydrateKit`, and the page shows the "Simple Kit" notice. This is the fallback path the agent relies on, so it has to be solid and fully grounded.

Widening a domain now recomposes only that domain's Cues (§14.2).

## Acceptance criteria

- [ ] `composeDeterministic(pre, bound)` produces a `KitDraft` from the templates (FR-10, FR-13):
  - 3-4 Sessions in the stage format;
  - Cues spread across domains;
  - no Cue repeated in the Kit;
  - each Session with a different theme and domain mix.
- [ ] `hydrateKit(draft, reg, bound, profile, meta)` fills in names, images and years from the run registry. It builds `Provenance` (Seeds with `learned` flags, signals, `synthetic`, `cached`, `envelope`) and produces a `Kit` with the **original** `window`, `widened`, `fingerprint`, `notices`, the `qloo` counters and `omittedDomains`.
- [ ] The `{name}` placeholder is filled in client-side only, at render time.
- [ ] The Kit handler pipeline emits `source: 'deterministic'` plus the notice "Simple Kit (AI composer unavailable). Every Cue still comes from Qloo."
- [ ] **Kit overview (UX §4.3):**
  - The left page shows the Person line, the Reminiscence timeline, the fingerprint tag ribbon (FR-14) and the Avoid count.
  - The right page shows Session pages: title, theme, format tag, duration, domain icons, Cue strip, **Open Session N** (disabled until ticket 17) and **See all Cues** (`<details>`).
- [ ] **§14.2:** widening Books recomposes only the book Cues, deterministically over the new registry slice, and every non-book Cue is unchanged.
- [ ] **SC-1:** every rendered Cue has `data-entity-id`.

## Files / modules (PLAN §3.3, §3.6)

- `src/agent/composeDeterministic.ts`, `src/agent/hydrate.ts`
- `src/server/handlers/kit.ts` (the full deterministic pipeline)
- `src/features/kit/KitView.tsx`, `AlbumSpread.tsx`, `SessionPage.tsx`, `ReminiscenceTimeline.tsx`

## Tests to write first (TDD)

- `src/agent/composeDeterministic.test.ts` (new): for P1-P5 × every stage, the output passes `validateKit` with 0 grounding drops, has no repeats and gives 3-4 Sessions.
- `src/agent/hydrate.test.ts` (new): names, images and years come only from the registry; Provenance fields are set; `window` is the original Window.
- `e2e/widen.spec.ts` (extended): after widening Books, every non-book Cue is unchanged (§14.2).
- `e2e/golden.spec.ts`: click 1 shows Session pages.
- Seams: 1 `QlooClient`, 8 handler factories.

## Comments
