# memory-lane-mvp: ticket index and frontier

- **Spec:** [`spec.md`](spec.md) (`Status: ready-for-agent`)
- **Source of truth:** `PLAN.md` v3 (§14 binding)
- **Tracker conventions:** `docs/agents/issue-tracker.md`
- **Labels:** `docs/agents/triage-labels.md`

Tickets are numbered in dependency order (blockers first) and follow the PLAN §10 slice order. Each ticket is a tracer-bullet slice sized for one fresh context window. A ticket is **unblocked** when every ticket on its `Blocked by:` line is done.

## Index

| # | Ticket | Slice | Status | Blocked by |
|---|---|---|---|---|
| 01 | [Repo, CI and quality gates](issues/01-repo-ci-quality-gates.md) | 1 | resolved | None |
| 02 | [Meet Margaret shows music Cues from fixtures](issues/02-meet-margaret-music-cues.md) | 1 | resolved | 01 |
| 03 | [Life Story wizard with a resumable local draft](issues/03-life-story-wizard-draft.md) | 2a | ready-for-agent | 02 |
| 04 | [Seeds and Avoid List resolve through Qloo; a finished Life Story builds a music Kit](issues/04-seeds-avoid-resolve.md) | 2a | ready-for-agent | 03 |
| 05 | [Resilient Qloo client: params, cache, retry and call budget](issues/05-qloo-client-resilience.md) | 2b-i | ready-for-agent | 04 |
| 06 | [Fixture Qloo client that behaves like Qloo for P1-P5](issues/06-fixture-client-qloo-semantics.md) | 2b-i | ready-for-agent | 05 |
| 07 | [Prefetch engine: 6 domains and a taste fingerprint](issues/07-prefetch-six-domains.md) | 2b-i | ready-for-agent | 06 |
| 08 | ["Why this?" Provenance and "Widen by 3 years"](issues/08-provenance-and-widen.md) | 2b-ii | ready-for-agent | 07 |
| 09 | [`checkText` and the vetted templates](issues/09-checktext-and-templates.md) | 3a-i | code resolved; human gate pending (template review) | 08 |
| 10 | [`validateKit`: a rogue draft is repaired into a compliant Kit](issues/10-validatekit-pipeline.md) | 3a-i | ready-for-agent | 09 |
| 11 | [Simple Kit: deterministic Sessions render in the Kit view](issues/11-simple-kit-sessions.md) | 3a-i | ready-for-agent | 10 |
| 12 | [Agent tools: `expand_theme`, `rerank_cues` and `compose_kit`](issues/12-agent-tools.md) | 3a-ii | ready-for-agent | 11 |
| 13 | [Agent loop composes a themed Kit; offline evals run in CI](issues/13-agent-loop-offline-evals.md) | 3a-ii | ready-for-agent | 12 |
| 14 | [Session Mode prototype variants and check-in (b)](issues/14-session-mode-prototype.md) | Prototype | ready-for-agent | 13 |
| 15 | [Streamed Kit build with a live trace and photo pile](issues/15-kit-stream-trace-photo-pile.md) | 3b | ready-for-agent | 13 |
| 16 | [Demo replay in under 3 s, Kit rate limits and the privacy spy](issues/16-demo-replay-limits-privacy.md) | 3b | ready-for-agent | 15 |
| 17 | [Session Mode player](issues/17-session-mode-player.md) | 4 | ready-for-agent | 14, 16 |
| 18 | [Live Reactions, the End button, wrap-up and offline Sessions](issues/18-reactions-wrapup-offline.md) | 4 | ready-for-agent | 17 |
| 19 | [End & build next Kit: Kit 2 learns from Reactions](issues/19-build-next-kit-learned-diff.md) | 5 | ready-for-agent | 18 |
| 20 | [Distressed → Exclusion with undo; demo generation-2 recorded replay](issues/20-distressed-exclusion-gen2-replay.md) | 5 | ready-for-agent | 19 |
| 21 | [Your data: export, import and delete all](issues/21-your-data-export-import-delete.md) | 5b | ready-for-agent | 20 |
| 22 | [Live-Qloo tooling, ready before the key](issues/22-live-qloo-tooling-prekey.md) | K (prep) | ready-for-agent | 07 |
| 23 | [Live Qloo swap](issues/23-live-qloo-swap.md) | K | **ready-for-human** | 22 + **Qloo key** |
| 24 | [Without Qloo: the Baseline Kit side by side](issues/24-without-qloo-compare.md) | 6 | ready-for-agent | 21 |
| 25 | [Live eval and the cross-family judge](issues/25-live-eval-and-judge.md) | 6 | ready-for-agent | 24 |
| 26 | [Safety: sensitive themes, song-level avoids and a calming Pause](issues/26-safety-sensitive-themes.md) | 7 | ready-for-agent | 25 |
| 27 | [Several Life Stories and a printable Kit](issues/27-several-life-stories-print.md) | 8a | ready-for-agent | 21 |
| 28 | [Polish: final tokens, states and performance from 320 to 1920](issues/28-polish-visual-perf.md) | 8b | ready-for-agent | 27 |
| 29 | [Submission: live URL, README, Devpost draft and v1.0.0](issues/29-submission.md) | 9 | ready-for-agent | 25 |
| 30 | [Shared listening: Visitor compare (stretch, cut first)](issues/30-shared-listening-visitor.md) | 8c | ready-for-agent | 23, 25 |

CORE tickets: 01-13, 15-25 and 29. Ticket 14 is the prototype and check-in. Tickets 26-28 are should-haves. Ticket 30 is a stretch goal, and the first cut (R10 cut order: 8c → 8b depth → the slice 7 judge).

## Frontier (as of 2026-10-03; tickets 01 and 02 are done)

**Ready now:**
- **03** Life Story wizard with a resumable local draft

**Next to unlock, along the critical path:** 02 → 03 → 04 → 05 → 06 → 07 → 08 → … → 21 → 24 → 25 → 29.

**Parallel lanes**, once their blockers are done:
- **22** (Live-Qloo tooling) opens as soon as 07 is done.
- **14** (prototype) and **15** (stream) both open after 13.
- **27** → **28** (stories, print, polish) open after 21, alongside 24 → 25.
- **26** (Safety) and **29** (Submission) both open after 25. Run 29 last, so the submission reflects everything that shipped.

**Blocked on a human:**
- **23** is `ready-for-human`. It is gated on the Qloo key; escalate Oct 12, and ship in labelled fixture mode on Oct 24 if the key still hasn't arrived. 30 waits on 23.
- **17** waits for the check-in (b) Session Mode variant decision recorded in 14.

**Optional pull-forward:** 09 only needs domain types, so it could start right after 02 if a second agent is free. Its edge to 08 follows PLAN sequencing, not a code dependency.

## Human gates inside agent tickets

| Ticket | Gate |
|---|---|
| 01, 29 | Creating the public GitHub repo, and the first public push (A27) |
| 14 | Check-in (b): pick the Session Mode variant; review `templates.ts` |
| 23 | Enter the Qloo key into `.env.local` and the Vercel env |
| 25 | Review the 20 judge-calibration labels |
| 29 | `vercel --prod`; record the video; submit on Devpost |

## How to work a ticket

1. Pick the lowest-numbered ticket whose blockers are all done and whose `Status:` is `ready-for-agent`.
2. Write the listed tests first (red), implement until they pass (green), then refactor.
3. Append notes under the ticket's `## Comments`.
4. When it's done, update its row here.
