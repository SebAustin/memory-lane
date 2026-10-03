# 30: Shared listening: Visitor compare (stretch)

Status: ready-for-agent
Blocked by: 23, 25
Slice: 8c Shared listening (C, cut first) · Size: S · Spec: ../spec.md

> **Stretch goal (FR-23, priority C).** This is the first thing cut if time runs short (R10). It needs live Qloo (ticket 23), because `/v2/analysis/compare` has no fixture semantics.

## What to build

A Visitor (often a grandchild) opens the Visitor tab on Compare, enters 2-5 of their own favorites (resolved like Seeds), and sees "Cues you'll both enjoy", with the overlap explained. By default the Visitor's favorites are not stored.

## Acceptance criteria

- [ ] **`POST /api/visitor-compare`** takes `{personSeedIds ≤ 5, visitorSeedIds ≤ 5}` and returns `Envelope<Cue[]>`. It uses the `compare` bucket, and malformed input → 400 (SC-12).
- [ ] The Qloo call is `/v2/analysis/compare` with `a.signal.interests.entities` / `b.signal.interests.entities`, `filter.type=urn:entity:artist` and `take=10` (PLAN §5.1).
- [ ] **Visitor tab** on `/p/[storyId]/compare`: the Visitor's Seeds use the `/api/resolve` flow with disambiguation. The "Cues you'll both enjoy" list carries an overlap explanation in aggregate wording (FR-23).
- [ ] The Visitor's Seeds are held in memory only and never written to `StoreV1` (FR-23, ADR 0001).

## Files / modules (PLAN §3.4, §3.6)

- `src/app/api/visitor-compare/route.ts`, `src/server/handlers/visitorCompare.ts`
- `src/qloo/http.ts` (`compare`)
- `src/features/compare/VisitorTab.tsx`

## Tests to write first (TDD)

- `src/server/routes.test.ts`: visitor-compare 400, 413 and 429.
- `src/qloo/params.test.ts`: the compare params snapshot.
- `e2e/visitor.spec.ts` (PLAN §10.1, FR-23): use a recorded compare fixture, and check that nothing is persisted (inspect the store after).

## Comments
