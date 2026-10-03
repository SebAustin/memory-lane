# 04: Seeds and Avoid List resolve through Qloo; a finished Life Story builds a music Kit

Status: ready-for-agent
Blocked by: 03
Slice: 2a Life Story (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

The Caregiver finishes the wizard. Each Seed and Avoid List entity is resolved through `POST /api/resolve` into a confirmed Qloo entity. An ambiguous match shows disambiguation chips and never auto-picks. Avoid topics show how they will be enforced. The Caregiver picks a Dementia Stage, reviews, and clicks **Build {name}'s Kit**. The Life Story is saved locally, and the music-only Kit for that new story opens at `/p/<uuid>/kit`.

## Acceptance criteria

- [ ] `POST /api/resolve` is a handler factory with body `{kind:'entity'|'tag', query≤80, domain?}`, parsed by `parseJson(schema.strict(), maxBytes)`. Malformed input → 400 with a generic message. Oversized input → 413 (SC-12, NFR-14).
- [ ] The `resolve` bucket is 60 per minute per IP (`createRateLimiter`, `clientKey` = sha256(daily salt + first x-forwarded-for)). Over the limit → 429 with `Retry-After` (NFR-15).
- [ ] `resolveSeed` returns `needs_input` unless the top match has similarity ≥ 0.92 and the runner-up < 0.80. It never auto-picks (FR-4). `resolveTag` maps Avoid topics to tags (FR-5).
- [ ] All text sent to Qloo goes through `scrubQuery` (first name removed) and is capped per PLAN §5.4.
- [ ] Step 4, Seeds (2-5) (FR-4):
  - One confident match shows a confirm polaroid.
  - An ambiguous match shows the "Which Doris Day did you mean?" radiogroup with "None of these".
  - No result shows "We couldn't find '…'. Check the spelling or try the full name."
  - Qloo down shows "We can't reach Qloo right now. Your answers are saved." with Retry.
  - Unresolved text is never accepted.
- [ ] Step 5, Avoid List (FR-5):
  - Entities resolve like Seeds.
  - Topics show their outcome ("Matched to a Qloo tag: …" or "We'll keep this out of conversation Prompts").
  - The off-by-default `sensitiveThemesOptIn` toggle uses the UX §3 copy.
- [ ] Step 6 (FR-6) has Early, Middle and Late radio cards ("Not sure? Choose Middle."), a summary with Edit links, and **Build {name}'s Kit**, which calls `saveLifeStory` and routes to the new story's Kit.
- [ ] `toDigest` drops `firstName` and replaces it with `{name}` in all free text (word boundary, case-insensitive). `profileFromStory` and `toSignals` build the request profile, with interests capped at 10 by weight (NFR-11).
- [ ] In fixture mode, an unknown `/search` returns `empty` with the hint "Fixture mode: try the demo Seeds (P1-P5)". The fixtures include an ambiguous "Doris Day" (EVALS (a)).
- [ ] `logEvent` writes one JSON line per request, with no bodies, names or raw IPs (PLAN §9).

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
