# 02: Meet Margaret shows music Cues from fixtures

Status: resolved
Blocked by: 01
Slice: 1 Skeleton (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

The first tracer bullet runs from the landing page to Qloo-shaped data and back to the screen. A visitor clicks **Meet Margaret** on `/` and lands on `/p/demo-margaret/kit`, which shows 15 music Cue cards from hand-made fixtures. Each card is an `article[data-entity-id]`. No keys or configuration are needed.

Agent, intake and store are stubbed. Until ticket 15 the Kit page gets its data as interim JSON from the `/api/kit` handler factory. Ticket 15 swaps this for the stream.

## Acceptance criteria

- [x] Every schema in PLAN §4.1 is implemented in `src/contracts/*.ts` (Zod 4), including `StoryId` (uuid or `'demo-margaret'`) and the `.strict()` request schemas.
- [x] `reminiscenceWindow(birthYear)` returns `{start: by+10, end: by+30, label}`, and `AGE_BUCKET = '55_and_older'` (FR-7).
- [x] There is a minimal `QlooClient` interface (PLAN §3.1 types: `Domain`, `Envelope`, `EnvelopeStatus`, `ErrorCode`, `QlooProvenance`) and a minimal `FixtureQlooClient`. It serves P1 music insights from `fixtures/qloo/index.json` (`fx-` entities). Ticket 06 extends it to full Qloo semantics.
- [x] `normalizeEntity(raw, imageHosts)` accepts an image as either a string or `{url}`. An image on a host that isn't allow-listed becomes `imageUrl: null`, and the card shows the monogram fallback.
- [x] The Margaret demo story (P1: born 1946, Memphis, Middle stage, Seeds Patsy Cline and Doris Day films, Avoid List: Vietnam War and "Tennessee Waltz") is a typed constant. Seeding it into the store comes in ticket 15.
- [x] `/` shows **Meet Margaret**, a plain link to `/p/demo-margaret/kit` (FR-1), and **Start a Life Story**, a link to `/intake` (a stub page is fine).
- [x] `/p/demo-margaret/kit` renders 15 `CueCard`s with `data-entity-id`. Images carry explicit width and height (SC-1 E2E part, NFR-9).
- [x] The footer shows the short not-medical-advice line: "Suggestions only, not medical advice." (FR-28).
- [x] SC-14: a fresh clone followed by `pnpm install`, `cp .env.example .env.local` and `pnpm dev` shows Margaret's music Cues with no keys.

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

### 2026-10-03, builder (Claude Opus 5.5)

**Done.** Red-first at the seams the ticket names (contracts, window, `normalizeEntity`, the fixture `QlooClient`, the handler factory), then the UI.

- **Gates, all local and green:**
  - `pnpm lint` (0 warnings), `pnpm typecheck`, `pnpm build` (6 routes), `pnpm scan:bundle` (30 files clean), and `gitleaks detect` (5 commits, no leaks).
  - `pnpm test:coverage`: 17 files, 195 tests. 99.4% statements, 91.7% branches. The `src/domain/**` and `src/qloo/**` gates are now live and met. `src/domain/validator.ts` does not exist yet, so its gate stays unregistered.
  - `pnpm test:e2e`: 70 passed, 2 skipped, on `phone`, `tablet`, `ipad` (webkit) and `desktop` (firefox). The two skips are the Tab-key tests, skipped on WebKit because Safari does not tab to links by default. `limits` has no spec yet (ticket 16).
- **What exists:**
  - **Contracts:** every PLAN §4.1 schema in `src/contracts/*.ts`, split by area, with inferred types. Tests cover valid and invalid cases for each schema, `.strict()` rejections (including a smuggled `firstName`), and `StoryId` accepting `'demo-margaret'`.
  - **Window:** `reminiscenceWindow(1946)` gives 1956 to 1976. It throws `RangeError` outside 1920-1975 and returns a frozen value. `AGE_BUCKET = '55_and_older'`.
  - **Qloo:** `QlooClient` has `insights` only. `FixtureQlooClient` serves 20 hand-made `fx-` Memphis artists from `fixtures/qloo/index.json` and `fx-p1-music.json`. It matches on type, location and window, and ignores interests. It also applies the exclusions itself. `normalizeEntity` accepts a string or `{url}` image, parses the URL, and drops off-list hosts, look-alike hosts and non-https schemes.
  - **Margaret:** the demo story is `MARGARET`, deep-frozen, with Seeds Patsy Cline, Pillow Talk and Move Over, Darling, and an Avoid List of "Vietnam War" and "Tennessee Waltz". It also has a digest, a Taste Profile and `margaretKitRequest()`.
  - **Handler:** `createKitHandler(deps)` plus `loadInterimKit()`. `POST /api/kit` returns interim JSON (music Cues, notices, status). The Kit page calls the same `loadInterimKit` core in-process rather than fetching its own route.
  - **UI:** the landing page, `/intake` stub, and `/p/[storyId]/kit` with `KitView`, `CueCard` and `Monogram`. Tokens from UX §7 are in `globals.css`, light and dark, plus the session-surface block. Fonts are loaded through `next/font`.
- **Design.** "The Family Album": Fraunces (soft, optical size) with Atkinson Hyperlegible Next; paper grain on one fixed layer; polaroid mats tilted by a 7-step rhythm, with tape, and a featured 2x2 Cue; a drawn Reminiscence timeline; luggage-tag Seeds; designed focus rings (3 px ring plus halo). Motion is transform and opacity only, gated by `prefers-reduced-motion` (E2E asserts no animation under reduce). Contrast was checked with a throwaway OKLCH script, not committed: ink on paper 15.6:1 (light) and 15.5:1 (dark); muted mat text 6.3:1; monogram initials 8.5-9.5:1; button 11.2:1.
- **Deviations and decisions (for review):**
  - **Fonts use `next/font/google`, not `next/font/local`.** The build downloads and self-hosts them, so the CSP stays `font-src 'self'`. The catch is that `next build` needs network access once. Vendoring the files (`next/font/local`) is a cheap follow-up for ticket 28 if offline builds matter.
  - **CSP change to ticket 01's proxy.** `upgrade-insecure-requests` is now dropped only for plain-http loopback requests (`localhost`, `127.0.0.1`, `[::1]`). Without that, WebKit upgraded every subresource of `http://localhost` to https and failed, so the `ipad` project ran unstyled and unhydrated and clicks did nothing. Ticket 01's note that WebKit was "fine" was true only for the HTML. Every other origin keeps the exact PLAN §7 policy. The change is covered in `proxy.test.ts`.
  - **`ImageUrl` is https-only** (`z.url({ protocol: /^https$/ })`), stricter than PLAN's `z.url()`, which accepts `javascript:`.
  - **Tailwind** is used for preflight only (`@import "tailwindcss/preflight.css" layer(base)`). All component styling is CSS Modules reading the tokens.
  - **Page chrome** is a `SiteChrome` component, not a root-layout wrapper, so ticket 17's Session Mode can stay chrome-free and the ticket's file paths stay as written. The top bar has only the wordmark. "Without Qloo" and "Your data" arrive with their routes.
  - **`whyThis` and the interim prompt are placeholders** (`{name}` is filled at render time). Ticket 08 replaces `whyThis` and the card shows no "Why this?" yet. The hand-made fixtures leave out Patti Page, because "Tennessee Waltz" is her signature song.
  - **`createQlooClient` refuses `QLOO_MODE=live`** until ticket 05.
  - **`vitest` now includes `*.test.tsx`.** `CueCard` is tested with `renderToStaticMarkup`.
  - **Plain `console.error` for the one handler error line.** There is no `logEvent` yet.
  - **A few UI helper tests were written in the same step as their implementation** (rhythm, timeline). The seam tests were red first.
- **Not done, by design:**
  - No `vercel link`, no push, no remote repo.
  - Rate limiting on `/api/kit` (ticket 16).
  - The Seeds-to-store seeding (ticket 15).
  - Axe, screenshots and visual-regression specs (ticket 28). The overflow, CSP, skip-link, focus and reduced-motion checks are already in `e2e/golden.spec.ts`.
- `next dev` re-added a "This is NOT the Next.js you know" block to `CLAUDE.md`. It is not part of this commit.
