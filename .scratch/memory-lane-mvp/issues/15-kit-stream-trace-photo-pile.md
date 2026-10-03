# 15: Streamed Kit build with a live trace and photo pile

Status: ready-for-agent
Blocked by: 13
Slice: 3b Stream + replay (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

Building a Kit becomes a live, accessible experience. `/api/kit` streams typed data parts. The page shows:
- the "Behind the scenes" trace, with server, Claude and validator lines;
- counters;
- a photo pile fed by candidates that sorts into Session pages.

The Kit lands once and is saved locally. With `LLM_MODE=off` it shows the Simple Kit. When Qloo fails on a first run, it shows the first-run error. The interim JSON response from ticket 02 is removed.

## Acceptance criteria

- [ ] `POST /api/kit` returns a UI message stream built with `createUIMessageStream`, with `maxDuration = 120` (PLAN §4.2, NFR-7):
  - **Parts:** non-transient typed parts `data-notice`, `data-trace` (stable IDs, so a line updates in place; `actor` is server, agent or validator), `data-candidates` (prefetch batches, then `expand_theme` batches) and **exactly one** `data-kit`.
  - **Failure:** `data-notice{level: 'error'}` and no Kit.
  - **Timing:** the first `data-trace` arrives within 2 s.
- [ ] `consumeKitStream(body, onSnapshot)` folds the parts into `{traces, candidates, kit, notices, status}`. `useKitStream` adds abort, so **Stop building** is always available. The client uses `fetch` + `readUIMessageStream`, not `useChat`.
- [ ] **Trace panel (FR-15, NFR-3, UX §5 and §9):**
  - Phases: Understanding (server), Asking Qloo (server, "6 at once"), Arranging (Claude), Checking (validator).
  - Counters: a `dl` showing Qloo calls, From cache, Cues found, Chosen, and Not from Qloo 0.
  - Ledger: an `ol` with `aria-live="off"`.
  - Announcements: a hidden, polite, atomic `role="status"` announces phase changes and results, at most once every 4 s. Errors use `role="alert"` once.
  - Layout: a 24rem rail at ≥ 1024 px, and a bottom bar with a sheet below that.
  - On success the panel collapses to "How this was made (N Qloo calls)", focus moves to the `h1`, and the status says "Kit ready".
- [ ] **Photo pile (UX §4.2):** fed by `data-candidates`. The `expand_theme` batch is labelled "Looking deeper". Cards FLIP-sort onto Session pages using transform and opacity only, and reduced motion leaves fades of ≤ 120 ms.
- [ ] **Simple Kit:** with `LLM_MODE=off`, the "Simple Kit" notice and Kit are shown.
- [ ] **Upstream failure, ≥ 2 domains erroring** (FR-24, SC-13):
  - With a saved Kit: the last saved Kit with a "Cached result" badge.
  - On a first run: "We couldn't build the Kit this time. Nothing was lost. [Try again] [Meet Margaret]".
- [ ] **Saving:** the client saves the Kit on `data-kit` (`Repository.saveKit`, ≤ 6 per story), so Session Mode can work offline later.
- [ ] **Demo story:** `/p/demo-margaret/kit` seeds the demo story into the store if it is missing. The request carries the digest and profile from the store.

## Files / modules (PLAN §3.4, §3.6, §4.2)

- `src/app/api/kit/route.ts`, `src/server/handlers/kit.ts`, `src/server/stream.ts` (`StreamEmitter` over `createUIMessageStream`)
- `src/features/kit/useKitStream.ts`, `src/features/kit/consumeKitStream.ts`, `src/features/kit/PhotoPile.tsx`, `src/features/kit/KitStates.tsx`
- `src/features/trace/TracePanel.tsx`, `TraceLine.tsx`, `TraceCounters.tsx`, `StatusAnnouncer.tsx`

## Tests to write first (TDD)

- `src/server/kitStream.test.ts` (PLAN §10.1, SC-13), running the handler factory and passing the real `Response` through `consumeKitStream` (the route → hook test). Cover:
  - part order and exactly one `data-kit`;
  - a first trace event in < 2 s on the fake clock;
  - the first-run error with no Kit;
  - `LLM_MODE=off` → deterministic.
- `e2e/kit-errors.spec.ts` (new; PLAN §8.1): the first-run error with `QLOO_FIXTURE_FAULTS=all`.
- `e2e/a11y.spec.ts` (started): axe on the Kit page during and after the build.
- Seams: 6 `StreamEmitter`, 8 handler factories, 11 `consumeKitStream`, 5 `LanguageModel`, 10 clock.

## Comments
