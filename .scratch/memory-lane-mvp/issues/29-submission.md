# 29: Submission: live URL, README, Devpost draft and v1.0.0

Status: ready-for-agent
Blocked by: 25
Slice: 9 Submission (CORE) · Size: M · Spec: ../spec.md

> PLAN gives slice 9 a dependency on slice 6 only. Schedule it after whatever of tickets 23 and 26-28 has shipped, so the submission reflects the final build.

## What to build

Package Memory Lane for judging:
- a live Vercel URL that works in incognito;
- a public MIT-licensed repo;
- a README that makes the Qloo story checkable;
- a drafted Devpost entry and video script;
- a green CI run on the `v1.0.0` tag.

## Acceptance criteria

- [ ] **README** (SC-16, NFR-25) has these sections:
  - **Why Qloo**;
  - the architecture diagram;
  - a redacted request-to-result walkthrough (server prefetch lines versus agent "Looking deeper" lines);
  - **Known limitations**: fixture mode if ticket 23 hasn't landed, artist era not gated, any eval misses;
  - **Responsible data**: local-first, the name scrub, ZDR and no training;
  - setup: `pnpm install`, `cp .env.example .env.local`, `pnpm dev`.
- [ ] **Repo:** `gh repo view --json visibility,licenseInfo` shows `PUBLIC` and `MIT`, and the About section shows MIT (A27).
- [ ] **CI:** a fresh-container job reproduces fixture mode from a clean clone in < 10 min (SC-14). CI is green on the tag `v1.0.0`. The final gitleaks and bundle scans are clean (SC-11).
- [ ] **Devpost and video:** the Devpost text is drafted, using the EVALS §5 evidence table, the side-by-side screenshot and the Kit 1 vs Kit 2 diff. A video script is drafted (A22).
- [ ] **Check-ins (c) and (d)** are held and recorded under Comments.
- [ ] **Human gates:**
  - `vercel --prod` runs only after the user's explicit OK.
  - Making the repo public and the first public push need the user's OK.
  - The user records the video and submits on Devpost.
  - Freeze on Oct 29 at 18:00 ET; submit by Oct 30 at 12:00 ET.

## Files / modules

- `README.md`, `LICENSE` (already MIT)
- `.github/workflows/ci.yml` (fresh-container job, tag trigger)
- `docs/devpost.md` (draft), `docs/video-script.md` (draft)

## Tests to write first (TDD)

- The fresh-container CI job is the test for SC-14. The manual SC-16 checklist goes under Comments.

## Comments

- 2026-10-03 (builder, slice 1 review): **SC-14, fresh-clone CI job.** Add a CI job that clones into an empty directory and runs exactly `pnpm install`, `cp .env.example .env.local`, `pnpm dev`, then asserts `/p/demo-margaret/kit` shows 15 `[data-entity-id]` Cues with no keys set. Slice 1 verifies the same flow only through `pnpm test:e2e` on a built tree.
