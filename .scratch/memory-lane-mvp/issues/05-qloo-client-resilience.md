# 05: Resilient Qloo client: params, cache, retry and call budget

Status: ready-for-agent
Blocked by: 04
Slice: 2b-i Prefetch engine (CORE), part 1 of 3 · Size: M · Spec: ../spec.md

## What to build

This is the live Qloo adapter and the params builder, verified entirely against an injected `fetch`. Every later Qloo caller gets the same guarantees:
- correct per-domain params;
- no throws;
- jittered retries on 429, 5xx and timeouts;
- a two-tier cache that serves stale data on error;
- a call budget that guards the agent's reserve.

You can verify it alone through `src/qloo/http.test.ts` and `params.test.ts`.

## Acceptance criteria

- [ ] `buildInsightsParams(req, bound)` follows the PLAN §5.1 table for music, film, TV, book, place, brand, the fingerprint, `expand_theme` and rerank (SC-3, FR-5, FR-7). Every call includes:
  - `filter.exclude.entities`
  - `filter.exclude.tags` (plus `SENSITIVE_TAG_IDS` unless opted in)
  - `feature.explainability=true`
  - `take=15` (places: 10)
- [ ] Film and TV use `filter.release_year.min/max` = the **effective** Window.
- [ ] Defaults for the gated items:
  - **[QLOO-GATED]** Book `release_year` is on by default.
  - **[QLOO-GATED]** Per-entity weights default to ordering plus the 10-ID cap.
- [ ] `src/qloo/sensitiveTags.ts` holds `fx-` placeholder IDs for war, bereavement and hospital/illness (**[QLOO-GATED]**, resolved in ticket 23).
- [ ] `HttpQlooClient({baseUrl, apiKey, fetch, cache, retry, sleep, random})` (NFR-18, SC-13):
  - It **never throws**.
  - It sends the key as the `X-Api-Key` header.
  - It retries only on 429, 5xx or timeout, at most 3 times.
  - `backoffDelay` is full jitter `min(2000, 250·2^n)·rand`, and `Retry-After` is honoured up to 2 s.
  - Each attempt times out after 8 s, and `signal` aborts both the wait and the fetch.
  - A 403 maps to `errorCode: 'unsupported_type'` or `'auth'`.
  - Bad shapes map to `'schema'` (passthrough Zod at the boundary).
- [ ] `cacheKey` = sha256(endpoint + sorted canonical query) and never contains a first name. `createTieredCache({lruMax: 500, runtime})` puts an LRU in front of Vercel Runtime Cache (namespace `qloo`, tag `qloo-v1`) (NFR-8):
  - Freshness: 24 h for insights and compare, 7 d for search and tags.
  - On error, a stale entry up to 7 d old is served with `status: 'degraded'`.
  - In-flight requests are de-duplicated.
- [ ] `createCallBudget(16, {agent: 4})`: `take('prefetch')` can never use the agent reserve. When the budget is exhausted the client returns `error` with `errorCode: 'budget'` and makes **no** HTTP call.
- [ ] `createQlooClient(cfg, deps)` selects Http or Fixture by `QLOO_MODE` without code changes (NFR-19).

## Files / modules (PLAN §3.1, §5)

- `src/qloo/params.ts`, `http.ts`, `cache.ts`, `cacheKey.ts`, `backoff.ts`, `budget.ts`, `sensitiveTags.ts`, `index.ts` (`createQlooClient`)
- New dependencies: `lru-cache`, `@vercel/functions`

## Tests to write first (TDD)

- `src/qloo/params.test.ts` (PLAN §10.1, SC-3): a snapshot per domain, with PLAN §5.1 as the spec. Exclusions and sensitive tags are present unless opted in. The widened versus original Window is applied only to film, TV and book.
- `src/qloo/http.test.ts` (PLAN §10.1, SC-13), with a fake `fetch`, `sleep` and `random`. Cover: retry on 429/500, `Retry-After`, 403, stale-on-error → `degraded`, schema error, `budget` with zero fetches, agent reserve honoured, abort mid-wait, image scrub, and the cache key containing no name.
- `src/qloo/cache.test.ts` (new): LRU then runtime, freshness windows, de-duplication.
- Seams: 2 injected `fetch`, 3 `sleep`/`random`, 4 `KvCache`, 10 clock.

## Comments
