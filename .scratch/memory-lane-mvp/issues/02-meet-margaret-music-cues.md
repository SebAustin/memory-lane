# 02: Meet Margaret shows music Cues from fixtures

Status: ready-for-agent
Blocked by: 01
Slice: 1 Skeleton (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

The first tracer bullet runs from the landing page to Qloo-shaped data and back to the screen. A visitor clicks **Meet Margaret** on `/` and lands on `/p/demo-margaret/kit`, which shows 15 music Cue cards from hand-made fixtures. Each card is an `article[data-entity-id]`. No keys or configuration are needed.

Agent, intake and store are stubbed. Until ticket 15 the Kit page gets its data as interim JSON from the `/api/kit` handler factory. Ticket 15 swaps this for the stream.

## Acceptance criteria

- [ ] Every schema in PLAN §4.1 is implemented in `src/contracts/*.ts` (Zod 4), including `StoryId` (uuid or `'demo-margaret'`) and the `.strict()` request schemas.
- [ ] `reminiscenceWindow(birthYear)` returns `{start: by+10, end: by+30, label}`, and `AGE_BUCKET = '55_and_older'` (FR-7).
- [ ] There is a minimal `QlooClient` interface (PLAN §3.1 types: `Domain`, `Envelope`, `EnvelopeStatus`, `ErrorCode`, `QlooProvenance`) and a minimal `FixtureQlooClient`. It serves P1 music insights from `fixtures/qloo/index.json` (`fx-` entities). Ticket 06 extends it to full Qloo semantics.
- [ ] `normalizeEntity(raw, imageHosts)` accepts an image as either a string or `{url}`. An image on a host that isn't allow-listed becomes `imageUrl: null`, and the card shows the monogram fallback.
- [ ] The Margaret demo story (P1: born 1946, Memphis, Middle stage, Seeds Patsy Cline and Doris Day films, Avoid List: Vietnam War and "Tennessee Waltz") is a typed constant. Seeding it into the store comes in ticket 15.
- [ ] `/` shows **Meet Margaret**, a plain link to `/p/demo-margaret/kit` (FR-1), and **Start a Life Story**, a link to `/intake` (a stub page is fine).
- [ ] `/p/demo-margaret/kit` renders 15 `CueCard`s with `data-entity-id`. Images carry explicit width and height (SC-1 E2E part, NFR-9).
- [ ] The footer shows the short not-medical-advice line: "Suggestions only, not medical advice." (FR-28).
- [ ] SC-14: a fresh clone followed by `pnpm install`, `cp .env.example .env.local` and `pnpm dev` shows Margaret's music Cues with no keys.

## Files / modules (PLAN §3)

- `src/contracts/*.ts`
- `src/domain/window.ts`
- `src/qloo/types.ts`, `src/qloo/fixture.ts`, `src/qloo/normalize.ts`
- `fixtures/qloo/index.json` and `fixtures/qloo/fx-*.json` (P1 music only for now)
- `src/demo/margaret.ts` (new)
- `src/server/handlers/kit.ts` (handler factory), `src/app/api/kit/route.ts`
- `src/app/page.tsx`, `src/app/p/[storyId]/kit/page.tsx`
- `src/features/kit/KitView.tsx`, `src/features/kit/CueCard.tsx`

## Tests to write first (TDD)

- `src/contracts/contracts.test.ts` (new): valid and invalid cases per schema, `.strict()` rejecting extra keys, and `StoryId` accepting `'demo-margaret'`.
- `src/domain/window.test.ts` (new): the window for 1946 is 1956-1976, plus the edge birth years 1920 and 1975.
- `src/qloo/normalize.test.ts` (new): string image versus `{url}` image, and a host that isn't on the list becoming `null`.
- `e2e/golden.spec.ts` (PLAN §10.1): start the golden path. Click 1 (**Meet Margaret**) shows ≥ 1 `[data-entity-id]`.
- Seams: 1 `QlooClient` (the fixture client) and 8 handler factories.

## Comments
