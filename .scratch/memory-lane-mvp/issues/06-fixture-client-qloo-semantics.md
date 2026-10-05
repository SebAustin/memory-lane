# 06: Fixture Qloo client that behaves like Qloo for P1-P5

Status: resolved
Blocked by: 05
Slice: 2b-i Prefetch engine (CORE), part 2 of 3 · Size: M · Spec: ../spec.md

## What to build

The whole product has to work before the Qloo key arrives, for **any** Taste Profile, including one changed by Reactions. Extend `FixtureQlooClient` so it models Qloo's semantics rather than exact request keys (R3, as amended by PLAN §14.3). Then hand-make the `fx-` fixture set for the five personas.

You can verify it alone through the fixture-client tests and strict mode.

## Acceptance criteria

- [x] **Insights lookup** matches on `(endpoint, filter.type, window min/max, location query)`. It **ignores interests and excludes**, so regeneration after Reactions still hits fixtures.
- [x] The client applies `filter.exclude.entities` and `filter.exclude.tags` itself.
- [x] **Tag-signal (`expand_theme`) requests** return the domain set filtered to entities that carry one of the tags. When no tag matches they return `empty`, **never the unfiltered set**. PLAN §14.3 overrides §3.1.
- [x] **Rerank:** `filter.results.entities` returns those IDs, re-scored, from any loaded fixture.
- [x] **Explainability** is computed deterministically for every requested Seed and Learned Favorite ID, using FNV-1a mapped to 0.30-0.90. It is marked `provenance.synthetic: true`.
- [x] **Unknown `/search`** returns `empty` with the hint "Fixture mode: try the demo Seeds (P1-P5)".
- [x] **Strict mode** throws only on an unknown `(endpoint, type, window, location)` combination.
- [x] **Faults:** `faults` is parsed from `QLOO_FIXTURE_FAULTS` (for example `all`, `book:500`, `music:429x4`) and is honoured only when `VERCEL_ENV` is unset (EVALS (c)).
- [x] **Hand-made fixtures** (about 40 `fx-` files):
  - Coverage: P1-P5 × 6 domains × {original, widened} Windows, plus fingerprints.
  - Size: each domain fixture holds **≥ 25 entities with tag coverage** (§14.3).
  - Special cases:
    - P3's TV set includes "General Hospital", for the §14.1 and EVALS (d) case.
    - One persona has an empty book domain in the original Window but not in the widened one (EVALS (b)).
    - The ambiguous "Doris Day" search is included.
- [x] **Strict-mode test:** `expand_theme` yields ≥ 1 entity that wasn't in the prefetch result (§14.3).

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

### 2026-10-04, builder (Claude Sonnet 5.5)

**Done.** Red-first at seam 1 (`QlooClient`, through `FixtureQlooClient`), with small known fixtures for the semantics and the bundled data for coverage.

- **Gates, all local:** `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (75 files, 1590 tests; `src/qloo` and every other gate met), `pnpm build`, `pnpm scan:bundle` and `pnpm test:e2e` (207 passed) after the new fixtures landed.
- **What exists:** `fixture.ts` (the client), `fixtureIndex.ts` (loading), `fnv.ts`, `faults.ts`; 50 `fixtures/qloo/fx-p<N>-*.json` files, the generated `src/qloo/fixtures.ts`, and the generator in `scripts/qloo-fixtures/` (`pnpm fixtures:build`; `build.test.ts` fails when the committed files drift from the specs). Edit a persona spec, rebuild, commit both.
- **Semantics as built:**
  - Lookup is `(filter.type, release-year window, location)`; interests and excludes never cause a miss. Location accepts a list of spellings per file ("Memphis", "Memphis, TN"...).
  - Files that share a lookup key (brands and fingerprints have no window or location) carry the persona's Seed ids in the index; the file whose Seeds overlap the request's interests most is served, then the one carrying the requested tags, then the first. Unknown interests still answer (the first file), so Reactions cannot cause a miss.
  - Tag signals return only entities carrying a tag, else `empty` with a hint, never the unfiltered set (§14.3; PLAN §3.1 was amended). Re-rank returns the ids from any loaded fixture, re-scored deterministically from the id and the interests. Exclusions apply to all of it.
  - Explainability is `syntheticScore(entityId|seedId)` (FNV-1a, 0.30 to 0.90) for each requested interest, only when `explainability` is requested. Provenance is always `synthetic: true`. The fixture files carry no `explainability` of their own.
  - **L4 folded in:** `take` must be a whole number from 1 to 50 (search 1 to 199), else `error:'bad_param'` with a hint, before any lookup or budget spend, exactly as the HTTP client does (both use `validateInsightsParams`). `take: 25` over-fetches still work.
  - **Budget:** the fixture client spends the call budget (and honours `budgetKind`) like the HTTP client, so the ladder, the reserve and the agent tool caps behave the same offline.
  - **Faults** (`QLOO_FIXTURE_FAULTS`): `scope[:status|timeout[xN]]`, scopes `all`, a domain, `fingerprint`, `search`, `tags`. A count is in HTTP requests as the resilient client sends them: the fixture plays out the client's 3 retries, so `music:429x2` recovers (`retries: 2`) and `music:429x4` ends in `rate_limited`. A malformed spec throws a clear error; the whole thing is ignored when `VERCEL_ENV` is set (empty counts as unset). `createQlooClient` wires it in.
  - **Strict mode** throws only for an `insights` request whose `(type, window, location)` no fixture covers. A covered key that returns nothing (excluded, tag-filtered, or the empty P4 book fixture) is `empty`; search and tags never throw.
- **Fixture set:** P1 Memphis, P2 Leeds, P3 Guadalajara, P4 Manila, P5 Brooklyn: 10 files each (music, place, brand, fingerprint of 20 tags; film, TV and book in the original and widened Windows). Every domain fixture has 25 or more entities, each with tags, except P4's original-window books (see below). Tests cover this for all 5 x 6, that the widened set holds the original's, that Window years are respected, and the strict `expand_theme` test (at least one new entity) for every persona and domain.
  - **Special cases:** P3's TV includes General Hospital; P1's music includes "Tennessee Waltz Revue" and the war titles carry the sensitive `War` tag (default exclusion removes them); P3's music includes "Amor Eterno Tribute Band" and P4's "Martial Law Marching Band" as deliberate Avoid-name fixtures; the ambiguous Doris Day search is in `fx-search.json`.
  - **EVALS (b) persona is P4 (Ernesto, Manila):** books are empty in 1968 to 1988 and 13 titles sit in the widened 1965 to 1991 (thin regional coverage, as EVALS notes). For ticket 08's widen e2e, build a story with the P4 Seeds and "Manila" as Hometown.
- **Notes for later tickets:**
  - Ticket 12: `expand_theme` sends tags only (PLAN 5.1), so for brands (no window or location) the fixture picks the file by tag coverage; tags every persona shares (like "Family") fall back to P1's file. The agent should draw from the fingerprint's distinctive tags, or the call should also carry `interests`.
  - Fixtures have no images, so every Cue shows its monogram (`QLOO_IMAGE_HOSTS` is a ticket 23 matter).
  - Place fixtures answer to the Hometown spellings only; a Care Location outside them is an `empty` with the fixture hint.
- **Names are real works and places with illustrative years;** descriptions say "Hand-made fixture". They are replaced by recorded data in ticket 22.
