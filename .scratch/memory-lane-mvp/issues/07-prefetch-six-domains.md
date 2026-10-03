# 07: Prefetch engine: Margaret's Kit shows 6 domains and a taste fingerprint

Status: ready-for-agent
Blocked by: 06
Slice: 2b-i Prefetch engine (CORE), part 3 of 3 · Size: M · Spec: ../spec.md

## What to build

Margaret's Kit page now shows Cues from all six domains plus a taste fingerprint. They are fetched in parallel by the server with no model, inside the 16-call budget. When a domain is empty, the relaxation ladder runs, and it never widens the Window. Partial and cached results show badges.

Names that hit an Avoid topic or the sensitive lexicon are dropped as they enter the run registry.

## Acceptance criteria

- [ ] `prefetch({client, bound, emit, signal})` runs P1 (music, film, TV, book) in parallel, then P2 (place, brand, fingerprint), with concurrency ≤ 6. It returns `Prefetch {registry, byDomain, fingerprint, budget}` (FR-14, NFR-8).
- [ ] **P3 ladder** (R2):
  - It runs only for `empty` domains, with ≤ 2 extra calls each from a 5-call pool: first drop tags, then use the top-2 Seeds only.
  - It **never widens the Window** and never relaxes Exclusions.
  - A domain still empty afterwards is listed in `omittedDomains`.
- [ ] Prefetch never draws on the agent reserve of 4.
- [ ] **Registry ingest screening (§14.1):** entity `name`s that match an Avoid topic or the sensitive lexicon are dropped *before* they are emitted as candidates or stored. P3's "General Hospital" never enters the registry.
- [ ] `BoundContext` is built server-side: the Window is recomputed from `birthYear`, together with `ageBucket`, Hometown, Care Location, `toSignals` (with opt-in), stage and `previousCueIds`. The model never controls these.
- [ ] Failure handling (SC-13, NFR-20):
  - One domain erroring → `partial`, with a badge and a gap card.
  - ≥ 2 domains erroring → an `upstream_error` outcome, consumed by tickets 15 and 16.
  - A `degraded` (stale) envelope → the "Cached result. Qloo is busy." badge (FR-24).
- [ ] `src/agent/trace.ts` holds typed label builders for the prefetch lines (UX §5), for example "Asking Qloo for films, 1956-1976, loved by people 55 and over → 15 Cues". All trace labels come from these builders.
- [ ] Margaret's Kit page groups Cues by domain and shows the fingerprint as a ranked tag ribbon.
- [ ] `src/qloo/**` coverage is ≥ 80% (SC-15).

## Files / modules (PLAN §3.3, §5.3)

- `src/agent/prefetch.ts`, `src/agent/registry.ts`, `src/agent/bound.ts`, `src/agent/trace.ts`
- `src/domain/lexicons.ts` (Avoid and sensitive lexicons, shared later with `checkText`)
- `src/server/handlers/kit.ts` (uses prefetch)
- `src/features/kit/DomainGroup.tsx`, `src/features/kit/Fingerprint.tsx`, `src/features/kit/StatusBadge.tsx`

## Tests to write first (TDD)

- `src/agent/prefetch.test.ts` (PLAN §10.1 FR-14 "prefetch test"), with `FixtureQlooClient` and a `StreamEmitter` spy. Cover:
  - the 6 domains and the fingerprint;
  - P1 before P2;
  - the ladder order, and the ladder never changing `release_year`;
  - an omitted domain;
  - the reserve left intact;
  - one fault → `partial`, two faults → `upstream_error`;
  - "General Hospital" dropped for P3.
- Extend `src/qloo/http.test.ts` with the SC-13 partial case if it isn't already covered.
- Seams: 1 `QlooClient`, 6 `StreamEmitter`, 3 `sleep`/`random`.

## Comments
