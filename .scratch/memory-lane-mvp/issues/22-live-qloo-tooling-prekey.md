# 22: Live-Qloo tooling, ready before the key

Status: ready-for-agent
Blocked by: 07
Slice: K Live Qloo (CORE), part 1 of 2 (pre-key prep) · Size: S · Spec: ../spec.md

## What to build

Write and test the scripts that slice K runs on the day the key arrives, against an injected `fetch` with canned responses. Then key day is "set the env var, run three commands". This ticket makes **no** live Qloo call.

> Split out of slice K so the agent-doable work isn't stuck behind the key. The swap itself is ticket 23 (`ready-for-human`).

## Acceptance criteria

- [ ] **`pnpm qloo:smoke`** (`scripts/qloo-smoke.ts`) runs one `/search` plus one `/v2/insights` per type: movie, tv_show, book, artist, place, brand and tag (NFR-21, SC-15).
  - It asserts a 200, non-empty results, and that **each filter takes effect**, by comparing the result with and without the filter.
  - It exits non-zero on a silently ignored param.
  - It reports `release_year` coverage for book **and tv_show** (§14.6).
- [ ] **`pnpm qloo:record`** (`scripts/qloo-record.ts`), in this order:
  1. Records live responses in the `fixtures/qloo/index.json` format (PLAN §5.5).
  2. Scrubs them.
  3. Collects `QLOO_IMAGE_HOSTS`.
  4. Resolves `SENSITIVE_TAG_IDS` (war, bereavement, hospital/illness) into `src/qloo/sensitiveTags.ts`.
  5. Deletes the hand-made `fx-` fixtures.
  - A `--dry-run` mode writes to a temp directory.
- [ ] Both scripts read config through `getServerConfig` and refuse to run without `QLOO_API_KEY` (except in dry-run against an injected `fetch`).
- [ ] Each script's `--help` says what it does and in which order to run them: `qloo:smoke && qloo:record && demo:record`.

## Files / modules (PLAN §5.5)

- `scripts/qloo-smoke.ts`, `scripts/qloo-record.ts`, and the `qloo:smoke` and `qloo:record` scripts in `package.json`

## Tests to write first (TDD)

- `scripts/qloo-smoke.test.ts` (new): canned responses for the 7 types pass. A case where `filter.release_year` has no effect fails with a non-zero exit. A 403 is reported as an unsupported type.
- `scripts/qloo-record.test.ts` (new): the dry run produces a valid index, the scrub removes nothing but personal fields, image hosts are collected, and sensitive tag IDs are written.
- Seams: 2 injected `fetch`, 9 `getServerConfig`.

## Comments
