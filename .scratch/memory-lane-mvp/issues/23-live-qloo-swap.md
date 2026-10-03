# 23: Live Qloo swap

Status: ready-for-human
Blocked by: 22
External blocker: Qloo API key (not issued as of 2026-10-03)
Slice: K Live Qloo (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

> **Gated on the Qloo key (A24).** Only the user can obtain the key and enter it (never in chat or commits). Once `QLOO_API_KEY` is in `.env.local` and the Vercel env, switch this ticket to `ready-for-agent`. An agent can then run the rest.
> Escalation (PLAN §10): on **Oct 12** the user re-asks (form + Discord). On **Oct 24** the team ships in labelled fixture mode and lists it under Known Limitations.

## What to build

Swap the product from fixtures to real Qloo data and images. Verify every parameter assumption with the contract smoke test, record real fixtures and demo recordings, and close every **[QLOO-GATED]** item in PLAN §0.

## Acceptance criteria

- [ ] **(Human)** The user puts the key into `.env.local` and the Vercel env (Developer role). `QLOO_MODE=live` boots without error.
- [ ] **Smoke:** `pnpm qloo:smoke` passes for all 7 types (SC-15).
  - A 401 means the wrong host: try `api.qloo.com` (A5).
  - A 403 means an unsupported type: document it and drop the domain gracefully.
- [ ] **Record:** `pnpm qloo:record && pnpm demo:record` re-records the fixtures and Margaret's Kit 1 and Kit 2, plus the Baseline if ticket 24 is done.
- [ ] **Close the [QLOO-GATED] items:** record each outcome in PLAN §0 and update the code to match.
  - Does book `release_year` take effect? If not, drop it and make books "era reported, not gated".
  - `tv_show` year coverage: if it's low, apply the same "era reported" rule (§14.6).
  - Per-entity weights: if they're honoured, Seeds are `high` and Learned Favorites with weight 3/2/1 map to high/medium/low.
  - `SENSITIVE_TAG_IDS`: replace the `fx-` placeholders.
  - `QLOO_IMAGE_HOSTS`: add them to the CSP `img-src` and the `normalizeEntity` allow-list (R11).
  - The real quota: tune the call budget and concurrency.
- [ ] **Re-run evals:** re-run `pnpm eval:offline` on the recorded fixtures (R15), and `pnpm eval:live` if ticket 25 is done.
- [ ] **Labels:** the replay banner switches from "fixture run" to the recorded date, and the "fixture data" Provenance label disappears for live explainability.

## Files / modules (PLAN §0, §5)

- `.env.local` and the Vercel env (user)
- `fixtures/qloo/*`, `recordings/demo-margaret/*`
- `src/qloo/sensitiveTags.ts`, `src/qloo/params.ts`, `src/qloo/budget.ts`, `src/proxy.ts`
- `PLAN.md` §0 (gated outcomes)

## Tests to write first (TDD)

- `pnpm qloo:smoke` is the contract test (PLAN §8.1 "Contract").
- Update `src/qloo/params.test.ts` snapshots for any gated param change. Existing offline evals must stay green on the recorded fixtures.

## Comments
