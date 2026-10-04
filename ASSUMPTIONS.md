# Assumptions

These decisions were made autonomously, because the user chose "mostly autonomous". Any of them can be revisited at a milestone check-in.

`PLAN.md` (v3) is the build source of truth. Where this file conflicts with it, PLAN.md wins.

| # | Assumption | Why | Revisit if |
|---|---|---|---|
| A1 | The issue tracker is local markdown under `.scratch/` | No git remote yet; solo project | A public GitHub repo exists → may switch to GitHub Issues |
| A2 | Default triage labels | No existing vocabulary | — |
| A3 | Single-context domain docs (`CONTEXT.md` + `docs/adr/`) | Single app | — |
| A4 | Agent config lives in `CLAUDE.md` | Claude Code is the primary harness | — |
| A5 | Qloo base URL is `https://hackathon.api.qloo.com`, authenticated with the `X-Api-Key` header | Hackathon developer guide | The key arrives and returns 401 → try `api.qloo.com` |
| A6 | Build against hand-made `fx-` fixtures until the Qloo key arrives. The fixture client models Qloo behaviour: it ignores interests in matching, applies excludes itself, and computes deterministic, labelled explainability (PLAN §3.1) | Key not issued; the reaction loop must work under any Taste Profile | Key arrives → slice K |
| A7 | Model is **`anthropic/claude-sonnet-5.5`**; judge is `openai/gpt-5.6-sol`. Both were verified live on the Gateway model list on 2026-10-03. `@ai-sdk/gateway` 4.0.103 is a direct dependency | User choice; a judge from another model family limits self-preference | Latency or cost issues |
| A8 | pnpm 9.15.9; Node 24 on Vercel; `.nvmrc` 24; `engines.node >= 22` | Installed toolchain | Vercel build issues |
| A9 | License is MIT | Permissive and detected by GitHub | — |
| A10 | The primary persona is the family Caregiver. Coordinators and therapists are served by up to 10 Life Stories, printing and Provenance | One coherent product | User wants a coordinator workflow |
| A11 | The UI is English only | Time | Judges need another language |
| A12 | A music Cue is a Qloo artist. The play link is an external search. Tracks are never Cues | No track entities (ADR 0003) | Qloo adds tracks |
| A13 | Birth years 1920-1975. Window = birth year + 10 to + 30. The **only** way to widen is the Caregiver's "Widen by 3 years" button (±3, once per film/TV/book domain); the relaxation ladder never widens. Cues outside the original Window are flagged, and era fit is always measured against the original Window. Age signal is `55_and_older` | Glossary; honest era claims | Qloo adds finer buckets |
| A14 | No treatment language | Cochrane review; regulatory exposure | Clinical review |
| A15 | The 10-30 Window is wider than the 15-24 music peak | Candidate depth | Evals show thin results |
| A16 | Storage is IndexedDB via `idb-keyval`, unencrypted, with no cookies. One versioned `StoreV1` key holds everything, including a single wizard draft | ADR 0001 | A care-home pilot needs shared-device protection |
| A17 | The first name stays in the browser and is scrubbed from all outbound free text. The Avoid List text and Seed names do go to the LLM | Data minimisation | Gateway terms are unacceptable |
| A18 | Rate limits come from `ServerConfig`: per-IP buckets (live Kit 6 per 10 min; replay 30 per 10 min, exempt from the cap), 1 WAF rule, a daily cap of 150 live runs, and prepaid credits with auto top-up OFF. Spend stays under about 50 USD | Public demo | Spend or traffic exceeds the cap |
| A19 | First trace event < 2 s. Demo replay Kit < 3 s (trace compressed to ≤ 2.5 s). Live Kit < 45 s at p95 | Streaming + replay-first | Measured latency is worse |
| A20 | SC-2 thresholds are provisional until live data exists | No real Qloo output | Distributions differ |
| A21 | Evergreen Chrome, Safari (iPad primary), Firefox, Edge | Tablet-first | — |
| A22 | Budget half a day for a possible Devpost video (slice 9) | Common requirement | Rules say no video |
| A23 | No paid resources beyond the existing Vercel and Gateway accounts. Hobby limits are acceptable | Plan guardrail | Limits are hit |
| A29 | SC-5: **≤ 7, met at click 6**. The improved Kit arrives at click 6; click 7 (Without Qloo) completes the judge story. End sits in the Session Mode bottom bar on every layout | Orchestrator decisions D2 and R8 | — |
| A30 | Every LLM call requests Gateway `zeroDataRetention` and `disallowPromptTraining` | Responsible data (R7) | No ZDR route → ZDR off, training still disallowed, documented |
| A31 | `RATE_LIMIT_MODE=off` (used by E2E) is honoured only when not deployed (`VERCEL_ENV` is not `preview` or `production`). `getServerConfig` throws otherwise | E2E across 4 projects would otherwise hit the live bucket | — |
| A32 | **FR-9 is a partial deviation** (pending user sign-off). The server prefetches the baseline candidates. The agent then makes bounded Qloo calls of its own (`expand_theme` ≤ 2, `rerank_cues` ≤ 2) before composing | Speed and a deterministic fallback, while keeping a real agent decision | User wants the agent to drive all fetching |

## Credential-scope preflight

Never paste keys into chat or commit them. The user enters keys through the wizard step.

| # | Service | Credential | Scope required | Status / how to verify | Needed by |
|---|---|---|---|---|---|
| A24 | Qloo API | Hackathon key via `X-Api-Key` | Read-only GETs on `/search`, `/v2/insights`, `/v2/tags` and `/v2/analysis/compare`, for artist, movie, tv_show, book, place, brand and tag | **Not issued yet.** On arrival: run `pnpm qloo:smoke`, which asserts every filter takes effect for all 7 types; a 403 means the type is unsupported for this key. Ask about quota in the Discord. Escalate on Oct 12 | Slice K |
| A25 | Vercel AI Gateway | `AI_GATEWAY_API_KEY` locally and in CI; OIDC on Vercel | Inference only on `anthropic/claude-sonnet-5.5` and `openai/gpt-5.6-sol`; prepaid credits; auto top-up OFF | **Model list verified 2026-10-03** (407 models; both IDs present). Still to check in slice 3a-ii: one call with `LLM_PROVIDER_OPTIONS` (ZDR, no training) succeeds, and the credit balance is visible. Slice 6 adds the judge temperature probe | Slices 3a-ii, 6 |
| A26 | Vercel hosting | CLI session | Create and link a project, set env vars (Developer role), deploy (production is gated on the user's OK), Fluid Compute | **`vercel whoami` verified: `henrysebastien1982-6771`.** Still to run in slice 1: `vercel link`, `vercel env ls` | Slices 1, 9 |
| A27 | GitHub | `gh` login | Create a public repo and push workflows: needs `repo` and `workflow` | **Verified: `SebAustin`, scopes `repo, workflow, gist, read:org`.** Later, `gh repo view --json visibility,licenseInfo` must show `PUBLIC` and `MIT`. The first push is gated | Slices 1, 9 |
| A28 | Qloo image hosts | None (hotlinked) | CSP `img-src` and the sanitizer allow-list | [QLOO-GATED]: collected by `pnpm qloo:record` | Slice K |
