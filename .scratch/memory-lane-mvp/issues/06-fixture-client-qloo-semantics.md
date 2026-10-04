# 06: Fixture Qloo client that behaves like Qloo for P1-P5

Status: ready-for-agent
Blocked by: 05
Slice: 2b-i Prefetch engine (CORE), part 2 of 3 · Size: M · Spec: ../spec.md

## What to build

The whole product has to work before the Qloo key arrives, for **any** Taste Profile, including one changed by Reactions. Extend `FixtureQlooClient` so it models Qloo's semantics rather than exact request keys (R3, as amended by PLAN §14.3). Then hand-make the `fx-` fixture set for the five personas.

You can verify it alone through the fixture-client tests and strict mode.

## Acceptance criteria

- [ ] **Insights lookup** matches on `(endpoint, filter.type, window min/max, location query)`. It **ignores interests and excludes**, so regeneration after Reactions still hits fixtures.
- [ ] The client applies `filter.exclude.entities` and `filter.exclude.tags` itself.
- [ ] **Tag-signal (`expand_theme`) requests** return the domain set filtered to entities that carry one of the tags. When no tag matches they return `empty`, **never the unfiltered set**. PLAN §14.3 overrides §3.1.
- [ ] **Rerank:** `filter.results.entities` returns those IDs, re-scored, from any loaded fixture.
- [ ] **Explainability** is computed deterministically for every requested Seed and Learned Favorite ID, using FNV-1a mapped to 0.30-0.90. It is marked `provenance.synthetic: true`.
- [ ] **Unknown `/search`** returns `empty` with the hint "Fixture mode: try the demo Seeds (P1-P5)".
- [ ] **Strict mode** throws only on an unknown `(endpoint, type, window, location)` combination.
- [ ] **Faults:** `faults` is parsed from `QLOO_FIXTURE_FAULTS` (for example `all`, `book:500`, `music:429x4`) and is honoured only when `VERCEL_ENV` is unset (EVALS (c)).
- [ ] **Hand-made fixtures** (about 40 `fx-` files):
  - Coverage: P1-P5 × 6 domains × {original, widened} Windows, plus fingerprints.
  - Size: each domain fixture holds **≥ 25 entities with tag coverage** (§14.3).
  - Special cases:
    - P3's TV set includes "General Hospital", for the §14.1 and EVALS (d) case.
    - One persona has an empty book domain in the original Window but not in the widened one (EVALS (b)).
    - The ambiguous "Doris Day" search is included.
- [ ] **Strict-mode test:** `expand_theme` yields ≥ 1 entity that wasn't in the prefetch result (§14.3).

## Files / modules (PLAN §3.1, §5.5)

- `src/qloo/fixture.ts`, `src/qloo/fnv.ts`, `src/qloo/faults.ts`
- `fixtures/qloo/index.json`, `fixtures/qloo/fx-*.json`

## Tests to write first (TDD)

- `src/qloo/fixture.test.ts` (new; covers the PLAN §8.1 "Fixture client" row):
  - matching ignores interests and excludes;
  - excludes are applied;
  - explainability is deterministic and labelled synthetic;
  - unknown `/search` → `empty` + hint;
  - a tag with no match → `empty`;
  - strict-mode expansion yields a new entity;
  - faults are ignored when `VERCEL_ENV` is set.
- Seam: 1 `QlooClient`.

## Comments

- 2026-10-03 (builder, slice 1 review): **L4, fixture `take` validation.** `FixtureQlooClient.insights` passes `params.take` straight to `slice`: a negative, fractional or `NaN` value gives surprising results (`slice(0, -1)` drops the last item). Validate it as a positive integer, capped at Qloo's 50, and answer `error:'bad_param'` like the live client will. Slice 1 over-fetches with `take: 25` and trims to 15 after filtering, so keep that behaviour when the client grows.
