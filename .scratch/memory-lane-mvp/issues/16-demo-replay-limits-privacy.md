# 16: Demo replay in under 3 s, Kit rate limits and the privacy spy

Status: ready-for-agent
Blocked by: 15
Slice: 3b Stream + replay (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

Click 1 of the golden path becomes instant. **Meet Margaret** replays a recorded run (trace, candidates, Kit) in under 3 s, under the label "Replay of a real run recorded <date> · Build it live" ("fixture run" before ticket 23). **Build it live** runs the real path.

The Kit route is hardened:
- per-IP buckets, with replay in its own bucket and exempt from the daily cap;
- the daily cap of live runs;
- 400 for replay on a non-demo story;
- a privacy spy test proving the first name never leaves the device.

## Acceptance criteria

- [ ] **`pnpm demo:record`** records Margaret's Kit 1 (draft, registry, trace, candidates) in fixture + mock mode under `recordings/demo-margaret/`. Kit 2 is added in ticket 20 and the Baseline in ticket 24.
- [ ] **`replayRecorded(rec, profile, emit)`:**
  - It streams the recorded trace and candidates compressed to ≤ 2.5 s.
  - It runs `validateKit` on the recorded draft using the **current** Exclusions and the recorded registry.
  - It emits `source: 'recorded'` and the replay notice.
  - The Kit renders in < 3 s (NFR-7, A19).
- [ ] **Replay banner:** "Replay of a real run recorded <date> · Build it live" ("fixture run" before ticket 23). **Build it live** sends `mode: 'live'`.
- [ ] **Demo upstream failure:** when ≥ 2 domains error at generation 1, the demo streams the Kit 1 recording instead of an error.
- [ ] **Replay on a non-demo story:** `mode: 'replay'` with a non-demo `storyId` → **400**.
- [ ] **Buckets, daily cap and logging** (SC-12, NFR-15, R6):
  - `kitLive` is 6 per 10 min plus the daily cap of 150 (`consumeDailyLlmRun`). When the cap is reached, the response is a deterministic or recorded Kit plus `notice: cap_reached`.
  - `kitReplay` is 30 per 10 min and is **exempt** from the cap.
  - A full bucket → 429 with `Retry-After`, and the UI shows a wait message with a countdown.
  - `x-request-id` appears in error notices. The `logEvent` fields follow PLAN §9, and the log never holds bodies, names or raw IPs.
- [ ] **Privacy spy, P6** (SC-10, NFR-11, EVALS (i)): an injected Qloo `fetch` and the recording model capture every outbound URL, body and prompt. None contains "Margaret" (word boundary, case-insensitive), and only allow-listed digest keys appear.
- [ ] **`e2e/ratelimit.spec.ts`** (the `limits` project, `RATE_LIMIT_MODE=on`): the 7th live Kit shows the wait message.

## Files / modules (PLAN §1 "Demo replay", §3.4)

- `src/agent/replay.ts`, `recordings/demo-margaret/kit1.json`, `scripts/demo-record.ts`
- `src/server/dailyCap.ts`, `src/server/handlers/kit.ts` (modes, buckets, cap), `src/server/log.ts`
- `src/features/kit/ReplayBanner.tsx`, `src/features/kit/WaitMessage.tsx`

## Tests to write first (TDD)

- `src/server/privacySpy.test.ts` (PLAN §10.1, SC-10).
- `src/server/routes.test.ts` (PLAN §10.1, SC-12): `/api/kit` 400 and 413; replay on a non-demo story → 400; 429 with `Retry-After` when limits are on; replay uses `kitReplay` and skips the cap; cap reached → `cap_reached` notice.
- `src/agent/replay.test.ts` (new): ≤ 2.5 s on the fake clock; current Exclusions applied, so a Cue excluded since the recording is dropped and backfilled.
- `e2e/ratelimit.spec.ts` (PLAN §10.1).
- `e2e/golden.spec.ts`: click 1 shows the replayed Kit in < 3 s.
- Seams: 2 injected `fetch`, 5 recording `LanguageModel`, 4 `KvCache` (daily cap), 8 handler factories, 9 `getServerConfig`, 10 clock.

## Comments
