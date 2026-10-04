# 04: Seeds and Avoid List resolve through Qloo; a finished Life Story builds a music Kit

Status: resolved
Blocked by: 03
Slice: 2a Life Story (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

The Caregiver finishes the wizard. Each Seed and Avoid List entity is resolved through `POST /api/resolve` into a confirmed Qloo entity. An ambiguous match shows disambiguation chips and never auto-picks. Avoid topics show how they will be enforced. The Caregiver picks a Dementia Stage, reviews, and clicks **Build {name}'s Kit**. The Life Story is saved locally, and the music-only Kit for that new story opens at `/p/<uuid>/kit`.

## Acceptance criteria

- [x] `POST /api/resolve` is a handler factory with body `{kind:'entity'|'tag', query≤80, domain?}`, parsed by `parseJson(schema.strict(), maxBytes)`. Malformed input → 400 with a generic message. Oversized input → 413 (SC-12, NFR-14).
- [x] The `resolve` bucket is 60 per minute per IP (`createRateLimiter`, `clientKey` = sha256(daily salt + first x-forwarded-for)). Over the limit → 429 with `Retry-After` (NFR-15).
- [x] `resolveSeed` returns `needs_input` unless the top match has similarity ≥ 0.92 and the runner-up < 0.80. It never auto-picks (FR-4). `resolveTag` maps Avoid topics to tags (FR-5).
- [x] All text sent to Qloo goes through `scrubQuery` (first name removed) and is capped per PLAN §5.4.
- [x] Step 4, Seeds (2-5) (FR-4):
  - One confident match shows a confirm polaroid.
  - An ambiguous match shows the "Which Doris Day did you mean?" radiogroup with "None of these".
  - No result shows "We couldn't find '…'. Check the spelling or try the full name."
  - Qloo down shows "We can't reach Qloo right now. Your answers are saved." with Retry.
  - Unresolved text is never accepted.
- [x] Step 5, Avoid List (FR-5):
  - Entities resolve like Seeds.
  - Topics show their outcome ("Matched to a Qloo tag: …" or "We'll keep this out of conversation Prompts").
  - The off-by-default `sensitiveThemesOptIn` toggle uses the UX §3 copy.
- [x] Step 6 (FR-6) has Early, Middle and Late radio cards ("Not sure? Choose Middle."), a summary with Edit links, and **Build {name}'s Kit**, which calls `saveLifeStory` and routes to the new story's Kit.
- [x] `toDigest` drops `firstName` and replaces it with `{name}` in all free text (word boundary, case-insensitive). `profileFromStory` and `toSignals` build the request profile, with interests capped at 10 by weight (NFR-11).
- [x] In fixture mode, an unknown `/search` returns `empty` with the hint "Fixture mode: try the demo Seeds (P1-P5)". The fixtures include an ambiguous "Doris Day" (EVALS (a)).
- [x] `logEvent` writes one JSON line per request, with no bodies, names or raw IPs (PLAN §9).

## Files / modules (PLAN §3.1, §3.2, §3.4)

- `src/app/api/resolve/route.ts`, `src/server/handlers/resolve.ts`
- `src/server/rateLimit.ts`, `src/server/clientKey.ts`, `src/server/parseJson.ts`, `src/server/log.ts`
- `src/qloo/resolve.ts`
- `src/domain/digest.ts` (`toDigest`, `scrubQuery`), `src/domain/profile.ts` (`profileFromStory`, `toSignals`)
- `src/features/intake/SeedStep.tsx`, `AvoidStep.tsx`, `StageStep.tsx`, `DisambiguationGroup.tsx`

## Tests to write first (TDD)

- `src/qloo/resolve.test.ts` (PLAN §10.1, FR-3/4/7): confident match, ambiguous → `needs_input`, empty, and never auto-picking.
- `src/server/routes.test.ts` (PLAN §10.1, SC-12), started here: `/api/resolve` 400, 413 and 429 with `Retry-After`, through seam 8 (handler factories) and seam 9 (`getServerConfig`).
- `src/domain/digest.test.ts` (new): the P6 occupation "Margaret's family bakery" becomes "{name}'s family bakery", and the output has no `firstName` key.
- `e2e/intake.spec.ts`: the full wizard with the demo Seeds. The ambiguous Doris Day shows chips and never auto-picks. Build opens a Kit with `[data-entity-id]` cards.
- Seams: 1 `QlooClient`, 8 handler factories, 9 `getServerConfig`, 10 clock (daily salt).

## Comments

### 2026-10-04, builder (Claude Opus 5.5)

**Done.** Red-first at the seams the ticket names (`nameSimilarity`, `toDigest`/`scrubQuery`, `profileFromStory`/`toSignals`, `resolveSeed`/`resolveTag` through `QlooClient`, the `/api/resolve` handler factory with `getServerConfig` and an injected clock), then the wizard in Testing Library (a scripted `Resolver`) and in Playwright.

- **Gates, all local:** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm scan:bundle`, `pnpm test:coverage` (52 files, 985 tests, 98.5% statements, 93.7% branches; every gate met) and `pnpm test:e2e` (see the report for the run).
- **What exists:**
  - **Server:** `POST /api/resolve` (`src/server/handlers/resolve.ts`, thin route via `routeFor`), `rateLimit.ts` (token buckets, injected clock, bounded keys), `clientKey.ts` (sha256 of a per-process-secret daily salt plus the first `x-forwarded-for`), `requestLog.ts` (one JSON line per request: route, status, ms, request id; no body, name or address).
  - **Qloo:** `QlooClient` gains `search` and `tags`. `resolveSeed` and `resolveTag` (`src/qloo/resolve.ts`) use `nameSimilarity` (`src/domain/nameSimilarity.ts`): `ok` only when the top hit is >= 0.92 and the runner-up < 0.80, otherwise `needs_input` (up to 5 candidates). Fixture mode serves `fixtures/qloo/fx-search.json` (25 entities: the P1-P5 demo Seeds under the same ids Margaret uses, an ambiguous "Doris Day" with two artists of that name plus "The Doris Day Show", and a few Avoid examples) and `fx-tags.json`. An unknown query returns `empty` with "Fixture mode: try the demo Seeds (P1-P5)".
  - **Domain:** `toDigest`, `scrubQuery` (`digest.ts`), `profileFromStory`, `toSignals` (`profile.ts`), `SENSITIVE_TAG_IDS` placeholders (`sensitiveTags.ts`). `buildInterimKit` now builds its Qloo params with `toSignals`, so interests are capped at 10 (Seeds first) and the sensitive tags are excluded unless opted in.
  - **UI:** steps 4-6 and Build in `src/features/intake/`. A lookup box (`EntityPicker`) resolves one entity at a time: a confirm print for a confident match, a real `radiogroup` of mini-polaroid chips plus "None of these" for `needs_input`, and the UX messages for no result, Qloo down (with Retry) and busy. The Avoid List adds topics (matched to a Qloo tag, or kept to Prompts) and the off-by-default sensitive-themes switch. Step 6 has Early/Middle/Late index cards, the review ledger with Edit buttons, and **Build {name}'s Kit**, which saves the Life Story, its profile, clears the draft and opens `/p/<uuid>/kit`. That page now renders stored stories through `StoredKit`, which posts the digest and profile to `/api/kit`.
- **Deviations and decisions (for review):**
  - **The first name is scrubbed in the browser.** The server never learns the name, so `scrubQuery` runs in the resolver client before the POST; the server only checks shape and length. An e2e test asserts no outbound `/api/` request contains "margaret".
  - **Draft Seeds can be fewer than 2.** `LifeStoryDraft.values` is `LifeStory.partial()` with `seeds` relaxed to at most 5, so each Seed is saved the moment it is confirmed. A finished `LifeStory` still needs 2-5. PLAN section 15 notes it.
  - **Search spans every Cue type** unless a domain is given. The UI sends no domain, and the chip shows the entity's type (Music, Film, TV...). `domain?` stays on the route as the ticket says.
  - **Avoid topics.** A confident tag becomes `{kind:'tag'}` (the typed words are not kept, only the tag name); anything looser stays `{kind:'topic'}`. Every Avoid item, whatever its kind, is also listed by name in `avoidTopics`, so Cue-name screening and `checkText` cover entities and tags too. Topics ride only on conversation Prompts and name screening; entities and tags are also excluded in Qloo by id.
  - **`logEvent` stays in `src/lib/log.ts`** (ticket 02), not `src/server/log.ts`. Request logging lives in `src/server/requestLog.ts`. `/api/kit` is not wrapped yet (ticket 16).
  - **`InterimKit` moved to `src/contracts/interim-kit.ts`**, so the browser validates the `/api/kit` answer. `BuildInterimKitDeps.client` is now `Pick<QlooClient, "insights">`.
  - **`QlooEntity.description`** (trimmed, at most 160 characters) tells look-alikes apart on the chips.
  - **A Seed cannot also be avoided**, and the reverse: the chip says "On your Avoid List" or "One of your favorites" and is disabled.
  - **Limits not covered by e2e:** the 429 and 413 paths are tested at the handler and route level; the E2E server runs with the limiter off.
- **Not done, by design:** several Life Stories per device (ticket 27), saving the Kit and streaming (ticket 15), axe and screenshot baselines (ticket 28), live Qloo `/search` shape (tickets 05 and 23).
