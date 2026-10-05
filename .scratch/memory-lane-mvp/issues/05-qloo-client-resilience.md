# 05: Resilient Qloo client: params, cache, retry and call budget

Status: resolved
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

- [x] `buildInsightsParams(req, bound)` follows the PLAN §5.1 table for music, film, TV, book, place, brand, the fingerprint, `expand_theme` and rerank (SC-3, FR-5, FR-7). Every call includes:
  - `filter.exclude.entities`
  - `filter.exclude.tags` (plus `SENSITIVE_TAG_IDS` unless opted in)
  - `feature.explainability=true`
  - `take=15` (places: 10)
- [x] Film and TV use `filter.release_year.min/max` = the **effective** Window.
- [x] Defaults for the gated items:
  - **[QLOO-GATED]** Book `release_year` is on by default.
  - **[QLOO-GATED]** Per-entity weights default to ordering plus the 10-ID cap.
- [x] `src/qloo/sensitiveTags.ts` holds `fx-` placeholder IDs for war, bereavement and hospital/illness (**[QLOO-GATED]**, resolved in ticket 23).
- [x] `HttpQlooClient({baseUrl, apiKey, fetch, cache, retry, sleep, random})` (NFR-18, SC-13):
  - It **never throws**.
  - It sends the key as the `X-Api-Key` header.
  - It retries only on 429, 5xx or timeout, at most 3 times.
  - `backoffDelay` is full jitter `min(2000, 250·2^n)·rand`, and `Retry-After` is honoured up to 2 s.
  - Each attempt times out after 8 s, and `signal` aborts both the wait and the fetch.
  - A 403 maps to `errorCode: 'unsupported_type'` or `'auth'`.
  - Bad shapes map to `'schema'` (passthrough Zod at the boundary).
- [x] `cacheKey` = sha256(endpoint + sorted canonical query) and never contains a first name. `createTieredCache({lruMax: 500, runtime})` puts an LRU in front of Vercel Runtime Cache (namespace `qloo`, tag `qloo-v1`) (NFR-8):
  - Freshness: 24 h for insights and compare, 7 d for search and tags.
  - On error, a stale entry up to 7 d old is served with `status: 'degraded'`.
  - In-flight requests are de-duplicated.
- [x] `createCallBudget(16, {agent: 4})`: `take('prefetch')` can never use the agent reserve. When the budget is exhausted the client returns `error` with `errorCode: 'budget'` and makes **no** HTTP call.
- [x] `createQlooClient(cfg, deps)` selects Http or Fixture by `QLOO_MODE` without code changes (NFR-19).

## Files / modules (PLAN §3.1, §5)

- `src/qloo/params.ts`, `http.ts`, `cache.ts`, `cacheKey.ts`, `backoff.ts`, `budget.ts`, `sensitiveTags.ts`, `index.ts` (`createQlooClient`)
- New dependencies: `lru-cache`, `@vercel/functions`

## Tests to write first (TDD)

- `src/qloo/params.test.ts` (PLAN §10.1, SC-3): a snapshot per domain, with PLAN §5.1 as the spec. Exclusions and sensitive tags are present unless opted in. The widened versus original Window is applied only to film, TV and book.
- `src/qloo/http.test.ts` (PLAN §10.1, SC-13), with a fake `fetch`, `sleep` and `random`. Cover: retry on 429/500, `Retry-After`, 403, stale-on-error → `degraded`, schema error, `budget` with zero fetches, agent reserve honoured, abort mid-wait, image scrub, and the cache key containing no name.
- `src/qloo/cache.test.ts` (new): LRU then runtime, freshness windows, de-duplication.
- Seams: 2 injected `fetch`, 3 `sleep`/`random`, 4 `KvCache`, 10 clock.

## Comments

- 2026-10-03 (builder, slice 1 review): **L6, env edge parsing.** `parseEnv` trims and treats blanks as unset, but does not reject duplicate or mixed-case `QLOO_IMAGE_HOSTS` entries, ports in `QLOO_BASE_URL`, or a `QLOO_BASE_URL` that is not https. Tighten these when the HTTP client reads them. Slice 1 also refuses `QLOO_MODE=live` at boot (`assertSafe` in `src/config/server-config.ts`): lift that refusal in ticket 23 once the client is wired, and restore the `QLOO_API_KEY` requirement then.

### 2026-10-04, builder (Claude Sonnet 5.5)

**Done.** Red-first at seam 2 (injected `fetch`), 3 (`sleep`/`random`), 4 (`KvCache`) and 10 (clock). No network anywhere in the tests; the real API was never called.

- **Gates, all local:** `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (66 files, 1279 tests; `src/qloo` 96% statements, 93% branches; every gate met), `pnpm build`, `pnpm scan:bundle`. E2E runs at the end of ticket 07 (the Kit page is untouched here).
- **What exists** (`src/qloo/`): `params.ts` (`buildInsightsParams`, `BoundContext`, `CueRequest`, `validateInsightsParams`), `wire.ts` (exact Qloo query names; boundary checks), `http.ts` (`HttpQlooClient`), `backoff.ts`, `cacheKey.ts`, `cache.ts` (tiered LRU + Runtime Cache, freshness, in-flight de-duplication), `budget.ts`, `sensitiveTags.ts`, and `createQlooClient(cfg, deps)` in `index.ts`.
- **`QLOO_MODE=live` is lifted** now that the adapter exists and is tested. It still needs `QLOO_API_KEY` (boot error without it, checked in `getServerConfig` and again in `createQlooClient`). PLAN sections 7 and 15.3 and `.env.example` were updated in the same commit. Nothing was run against the real API.
- **L6 folded in.** `QLOO_BASE_URL` must be a bare https origin (no port, credentials, path, query or fragment) and is normalized to the origin; the default is `https://hackathon.api.qloo.com`. `QLOO_IMAGE_HOSTS` rejects a host listed twice (after folding case). Mixed case is accepted and lower-cased, as slice 1 already tested, since hostnames are case-insensitive.
- **Decisions and deviations (for review):**
  - **Budget is spent per HTTP request, not per cache hit.** A fresh cache answer costs nothing; retries of one request cost one unit. Budget is checked after the fresh-cache lookup and before the network, and a spent budget is an error even if a stale entry exists (stale is for failures).
  - **`CallOpts.budgetKind`** (`prefetch` default, or `agent`) tells the client which side of the budget a call spends. `CallBudget` also gained `remaining(kind)` and `used()` for the trace and the request log.
  - **`ErrorCode` gained `'aborted'`** (the caller's signal fired). A caller that aborts gets it at once; a de-duplicated request is cancelled only when every waiting caller has gone, so one visitor disconnecting never cuts off another.
  - **403:** `unsupported_type` for insights, `auth` for search and tags. 404 and 422 are `bad_param`. A network failure (not a timeout) is `upstream` and is not retried, per the ticket's "429, 5xx or timeout only".
  - **`redirect: 'error'`** on every request, so the key can never follow a redirect to another host.
  - **Stale entries are the raw Qloo body** (re-validated on read), so an allow-list change applies and a poisoned cache entry is just a miss.
  - **`SENSITIVE_TAG_IDS`:** `src/qloo/sensitiveTags.ts` re-exports the single definition in `src/domain/sensitiveTags.ts` (`toSignals` is pure and shared with the browser, so the data stays in `domain`). Ticket 23 edits the one list.
  - **Widening, weights, take:** weights default to ordering plus the 10-id cap, so there is no weight option yet; `ParamOptions.bookReleaseYear` (default true) is the one gated switch. Prefetch asks for `take=15` (places 10), so name screening can leave a domain a few Cues short of 15; the slice 1 over-fetch (`take: 25`, trimmed) stays only in `buildInterimKit` until ticket 07 replaces it.
  - **`compare` is not on `QlooClient` yet.** It has no caller before ticket 30 and its response shape is unverified; add it there.
  - **`insights` result type:** `{entities, tags?}`. A `urn:tag` request returns `tags` (with `affinity`) and an empty `entities`.
- **Not done, by design:** the fixture client still has its slice 1 semantics (ticket 06); `QLOO_IMAGE_HOSTS` and the real sensitive tag ids wait for the key (ticket 23).
