# 01: Repo, CI and quality gates

Status: ready-for-agent
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

- [ ] `package.json` has scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:coverage` and `test:e2e`. Node is pinned: `.nvmrc` 24 and `engines.node >= 22` (NFR-22).
- [ ] Vitest 5 with `@vitest/coverage-v8` is configured. Thresholds: `src/domain/**` ≥ 80%, `src/domain/validator.ts` ≥ 90% and `src/qloo/**` ≥ 80%, applied once those files exist (SC-15, NFR-23). `server-only` is aliased to an empty module in Vitest so that server modules are testable.
- [ ] `playwright.config.ts` defines the projects `phone` (chromium 375), `tablet` (chromium 768), `ipad` (webkit) and `desktop` (firefox 1440). It also defines a `limits` project that runs only `e2e/ratelimit.spec.ts`. E2E runs against `next build && next start` with `QLOO_MODE=fixture LLM_MODE=mock ALLOW_MOCK_LLM=1 RATE_LIMIT_MODE=off` (PLAN §8.1).
- [ ] The GitHub Actions workflow runs lint, typecheck, tests with coverage, gitleaks over the full history, and `scripts/scan-bundle.ts`. The scan builds with canary key values and fails if a canary appears in `.next/static/**`. Browser source maps are off (SC-11, NFR-13).
- [ ] `getServerConfig(env)` returns `ServerConfig` (PLAN §3.4) with these defaults:
  - `QLOO_MODE=fixture`
  - `LLM_DAILY_RUN_CAP=150`
  - the limits table defaults, with optional `RL_<BUCKET>` overrides
- [ ] `getServerConfig(env)` enforces these rules (R5, A31, SC-12):
  - It **throws** when `RATE_LIMIT_MODE=off` and `VERCEL_ENV` is set.
  - Live Qloo mode without `QLOO_API_KEY` is a boot error.
  - `ALLOW_MOCK_LLM` and `QLOO_FIXTURE_FAULTS` are honoured only when `VERCEL_ENV` is unset.
- [ ] There are no `NEXT_PUBLIC_` variables. `.env.example` lists every variable from PLAN §7 with no values (NFR-22).
- [ ] `src/proxy.ts` sets a per-request CSP nonce and the exact policy in PLAN §7, plus HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a restrictive `Permissions-Policy`. `img-src` reads `QLOO_IMAGE_HOSTS` (empty until ticket 23) (NFR-16).
- [ ] ESLint bans `dangerouslySetInnerHTML` (NFR-16).
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
