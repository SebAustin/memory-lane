# 18: Live Reactions, the End button, wrap-up and offline Sessions

Status: ready-for-agent
Blocked by: 17
Slice: 4 Session Mode (CORE), part 2 of 2 · Size: M · Spec: ../spec.md

## What to build

During a Session the Caregiver taps Engaged, Neutral or Distressed for a Cue, and the Reaction is logged locally. After the first Reaction, the End button changes to **End & build next Kit**. With no Reactions it stays **End Session**, which asks for confirmation and leads to wrap-up.

The wrap-up state (`?cue=done`) lets Reactions be logged afterwards. A Distressed tap shows a calm banner. The whole Session works with the network off.

## Acceptance criteria

- [ ] **Reaction radiogroup** (FR-20, NFR-1):
  - Three options: Engaged, Neutral and Distressed.
  - Each has an SVG glyph, a label, a 2 px border, a check when selected and `aria-checked`, and is ≥ 96 × 56.
  - Nothing auto-advances.
  - Reactions are optional.
- [ ] Reactions are stored in a `SessionLogEntry` (≤ 16 Reactions) through `Repository.appendSessionLog`.
- [ ] **End button:**
  - With 0 Reactions it reads **End Session** and confirms: "End this Session? [Keep going] [End Session]". Confirming leads to wrap-up.
  - With ≥ 1 Reaction it reads **End & build next Kit**, with no modal. It saves the log and routes to the Kit with a "build next" intent; ticket 19 performs the build.
- [ ] **Wrap-up (`?cue=done`)** has:
  - "How did it go?" with one radiogroup per Cue ("Not logged" when empty) and a live summary;
  - **Build next Kit** and **Done for today**;
  - the copy "Engaged Cues become Learned Favorites. Distressed Cues are left out next time."
- [ ] **Distressed banner** (FR-28): "That's okay. Let's pause. [Switch to something calming] [Skip this one] [End Session] [Undo]" plus "We'll leave this out from now on." The banner is persistent. Undo here removes the Reaction from the log; the Taste Profile effect and its undo are in ticket 20.
- [ ] **Offline** (FR-19):
  - Session Mode works from the saved Kit with the network off.
  - A "Working offline" tag appears.
  - No Qloo or LLM call is made during a Session.
  - Screen wake lock is best effort.
- [ ] **Storage full:** the error reads "We couldn't save on this device. Export your data to keep it. [Export]".

## Files / modules (PLAN §3.5, §3.6)

- `src/features/session-mode/ReactionGroup.tsx`, `EndButton.tsx`, `WrapUp.tsx`, `DistressBanner.tsx`, `OfflineTag.tsx`
- `src/lib/store/repository.ts` (`appendSessionLog`)

## Tests to write first (TDD)

- `e2e/golden.spec.ts` (PLAN §10.1): clicks 1-5 on the 4 projects. After click 3 the End label is **End & build next Kit**. With 0 Reactions, End asks for confirmation.
- `e2e/offline.spec.ts` (new; PLAN §10.1 FR-19 "offline test"): `context.setOffline(true)`, then run a full Session and assert there are no network requests to `/api/*`.
- `e2e/a11y.spec.ts`: the Reaction radiogroup works from the keyboard and reports `aria-checked`.
- `src/lib/store/repository.test.ts`: `appendSessionLog` is immutable and enforces the 16-Reaction cap.
- Seams: 7 `KeyValueStorage`.

## Comments
