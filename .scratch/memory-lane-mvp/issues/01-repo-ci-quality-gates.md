# 01: Repo, CI and quality gates

Status: resolved (code complete; human-gated items pending: `vercel link` / `vercel env ls`, public GitHub repo, first push)
Blocked by: None (can start immediately)
Slice: 1 Skeleton (CORE), part 1 of 2 · Size: S-M · Spec: ../spec.md

## What to build

Prefactor the bare Next.js 16 scaffold into a project every later ticket can land on green. When this ticket is done:
- A push runs CI: lint, typecheck, unit tests with coverage gates, a gitleaks scan of the history, and a bundle canary scan.
- Every response carries the security headers.
- Server config is validated, and it refuses unsafe combinations.
- The Vercel project is linked.

You can check it alone: CI is green on the scaffold, `curl -I /` shows the CSP, and the scan fails if a canary is planted.

## Acceptance criteria

- [x] `package.json` has scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:coverage` and `test:e2e`. Node is pinned: `.nvmrc` 24 and `engines.node >= 22` (NFR-22).
- [x] Vitest 5 with `@vitest/coverage-v8` is configured. Thresholds: `src/domain/**` ≥ 80%, `src/domain/validator.ts` ≥ 90% and `src/qloo/**` ≥ 80%, applied once those files exist (SC-15, NFR-23). `server-only` is aliased to an empty module in Vitest so that server modules are testable.
- [x] `playwright.config.ts` defines the projects `phone` (chromium 375), `tablet` (chromium 768), `ipad` (webkit) and `desktop` (firefox 1440). It also defines a `limits` project that runs only `e2e/ratelimit.spec.ts`. E2E runs against `next build && next start` with `QLOO_MODE=fixture LLM_MODE=mock ALLOW_MOCK_LLM=1 RATE_LIMIT_MODE=off` (PLAN §8.1).
- [x] The GitHub Actions workflow runs lint, typecheck, tests with coverage, gitleaks over the full history, and `scripts/scan-bundle.ts`. The scan builds with canary key values and fails if a canary appears in `.next/static/**`. Browser source maps are off (SC-11, NFR-13).
- [x] `getServerConfig(env)` returns `ServerConfig` (PLAN §3.4) with these defaults:
  - `QLOO_MODE=fixture`
  - `LLM_DAILY_RUN_CAP=150`
  - the limits table defaults, with optional `RL_<BUCKET>` overrides
- [x] `getServerConfig(env)` enforces these rules (R5, A31, SC-12):
  - It **throws** when `RATE_LIMIT_MODE=off` and `VERCEL_ENV` is set.
  - Live Qloo mode without `QLOO_API_KEY` is a boot error.
  - `ALLOW_MOCK_LLM` and `QLOO_FIXTURE_FAULTS` are honoured only when `VERCEL_ENV` is unset.
- [x] There are no `NEXT_PUBLIC_` variables. `.env.example` lists every variable from PLAN §7 with no values (NFR-22).
- [x] `src/proxy.ts` sets a per-request CSP nonce and the exact policy in PLAN §7, plus HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a restrictive `Permissions-Policy`. `img-src` reads `QLOO_IMAGE_HOSTS` (empty until ticket 23) (NFR-16).
- [x] ESLint bans `dangerouslySetInnerHTML` (NFR-16).
- [ ] `vercel link` and `vercel env ls` have run, and their output (no secrets) is recorded under Comments. Preview deploys only, with no production deploy.
- [ ] **Human gate:** creating the public GitHub repo and the first push wait for the user's OK (A27).

## Files / modules (PLAN §3, §7)

- `package.json`, `.nvmrc`, `.env.example`, `next.config.ts` (`productionBrowserSourceMaps: false`), `eslint.config.mjs`
- `vitest.config.ts`, `playwright.config.ts`
- `.github/workflows/ci.yml`
- `scripts/scan-bundle.ts`
- `src/config/env.ts` (server-only Zod env)
- `src/server/config.ts` (`getServerConfig`)
- `src/proxy.ts`
- New dependencies: `server-only`, `tsx`

## Tests to write first (TDD)

- `src/server/config.test.ts` (PLAN §10.1, SC-12), through seam 9 `getServerConfig(env)`. Cover: the defaults, the `RL_*` overrides, the throw on `RATE_LIMIT_MODE=off` with `VERCEL_ENV` set, live mode without a key, and the mock/faults flags being ignored when `VERCEL_ENV` is set.
- `src/proxy.test.ts` (new): every header is present, and the nonce differs per request.
- A self-test for `scripts/scan-bundle.ts`: a planted canary makes it exit non-zero.

## Comments

### 2026-10-03, builder (Claude Sonnet 5.5)

**Done.** TDD at the seams named above (red first, then green): `getServerConfig(env)` (seam 9), `proxy()`, and the bundle scan CLI.

- **Gates, all local and green:**
  - `pnpm lint`, `pnpm typecheck` (`next typegen && tsc --noEmit`, verified on a tree with `.next` and `next-env.d.ts` deleted), `pnpm test:coverage` (4 files, 39 tests; coverage 100% lines, 97% branches), and `pnpm build`.
  - `pnpm test:e2e`: 12/12 smoke tests on `phone`, `tablet`, `ipad` (webkit) and `desktop` (firefox). The `limits` project has no spec yet (`e2e/ratelimit.spec.ts` lands in ticket 16).
  - `gitleaks detect` locally: 3 commits, no leaks.
  - `actionlint` on `.github/workflows/ci.yml`: clean.
- **Coverage gates** (`vitest.config.mts`) register only once the guarded paths exist: `src/domain/**` 80, `src/domain/validator.ts` 90, `src/qloo/**` 80. Checked by planting a file under `src/domain/`: the run fails with `Coverage ... does not meet "src/domain/**" threshold (80%)`.
- **Bundle scan.** `pnpm scan:bundle` builds with random canary values for `QLOO_API_KEY` and `AI_GATEWAY_API_KEY`, and also exposes them as `NEXT_PUBLIC_<NAME>`. That is the one way a renamed variable would be inlined. It then scans all of `.next/static/**`, source maps and binaries included, and fails closed on a missing or empty directory.
  - Planted a client page reading `process.env.NEXT_PUBLIC_QLOO_API_KEY`: exit 1, `canary #0 found in chunks/....js`.
  - Removed it: `34 files under .next/static are clean`, exit 0.
  - `scripts/scan-bundle.test.ts` is the permanent self-test.
- **Headers.** `curl -sI` against `pnpm start` shows the exact PLAN §7 CSP with a nonce that changes per request, plus HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and `Permissions-Policy`. They are present on 200, 404 and `/_next/static` responses. Scripts carry the nonce, and the E2E check shows no CSP violation in chromium, webkit and firefox (`upgrade-insecure-requests` on localhost is fine in webkit).
- **Design notes and deviations (for review):**
  - `ServerConfig` gains one additive field, `fixtureFaults: string | undefined`. It is already gated on `VERCEL_ENV`, and ticket 06 parses it.
  - `LLM_MODE=mock` takes effect only with `ALLOW_MOCK_LLM=1` and `VERCEL_ENV` unset. Otherwise it is "ignored", meaning treated as unset, so the mode falls back to `gateway`. `ALLOW_MOCK_LLM` must be `0` or `1`.
  - `RL_<BUCKET>` overrides are named `RL_KIT_LIVE`, `RL_BASELINE_REPLAY` and so on, with the value `<capacity>/<perMinutes>` (for example `6/10`). Malformed values are a boot error.
  - Env errors name the offending variable and never echo values (tested with a secret).
  - `QLOO_IMAGE_HOSTS` accepts bare hostnames or `*.host` only. `getServerConfig` rejects anything else at boot. The proxy drops unsafe entries instead of throwing, so a bad value cannot inject CSP directives, and the per-request path never fails.
  - The proxy adds `'unsafe-eval'` to `script-src` only when `NODE_ENV=development` (React debugging; Next CSP guide). Production is the exact §7 policy.
  - The root layout calls `await connection()`. A per-request nonce needs dynamic rendering; static prerendering would ship nonce-less scripts that `'strict-dynamic'` blocks. Every route is therefore `ƒ`.
  - `test:e2e` is `next build && playwright test`, with two `next start` servers sharing the build: port 3100 with `RATE_LIMIT_MODE=off`, port 3101 with `on` for the `limits` project.
  - Script split: the CLI is `scripts/scan-bundle.ts`, and the logic is in `scripts/lib/scan.ts`.
  - Added dependencies: `server-only`, `tsx` only. Playwright browsers installed with `pnpm exec playwright install chromium webkit firefox`.
  - CI actions are pinned to major tags (`checkout@v7`, `setup-node@v7`, `pnpm/action-setup@v6`, `gitleaks-action@v3`, `upload-artifact@v7`), not SHAs. Consider SHA-pinning before submission.
  - No Prettier is configured in the repo; ESLint is the only lint/format gate.
  - `src/app/prototype/session-mode/` is untouched. The pre-existing uncommitted edits to `UX.md` and ticket 14 are not part of this commit.

**Human-gated, NOT done (per instructions):**
- `vercel link` and `vercel env ls` (the output must be recorded here, with no secrets). Preview deploys only; no production deploy.
- Creating the public GitHub repo (A27) and the first `git push`. CI has therefore not yet run on GitHub; the same commands pass locally.

