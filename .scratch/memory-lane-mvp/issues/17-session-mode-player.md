# 17: Session Mode player

Status: ready-for-agent
Blocked by: 14, 16
Slice: 4 Session Mode (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

**Open Session 1** opens a calm, full-screen, tablet-first player in the variant chosen at check-in (b). It shows one Cue per screen, Prompts sized to the stage, and each sensory activity on its own screen. A bottom bar holds Back, Skip, the Reactions slot, Next and End on every layout. It meets AAA contrast and 48 px targets.

Reactions and End behaviour come in ticket 18.

## Acceptance criteria

- [ ] **Route and screens:** `/p/[storyId]/session/[n]?cue=<i>` uses `data-surface="session"`, with no grain and no rotation (FR-18, FR-6). Each screen shows:
  - the flat image;
  - the domain and year;
  - the title;
  - Prompts per stage: early ≤ 3, middle 1-2, late image-first with ≤ 12 words;
  - a "Play on…" link for music Cues that opens an external artist search, with no embedded playback.
- [ ] Each item in `sensoryActivities[]` gets its own screen. Next on the last Cue goes to `?cue=done` (the state shell is filled in ticket 18).
- [ ] **Bottom bar** (UX §4.5, NFR-2):
  - It holds **Back, Skip, Reactions slot, Next and End** on every layout.
  - Controls are 56 px tall, and nothing is under 48 px.
  - Body text is ≥ 24 px and Prompts are 28-30 px.
- [ ] **Contrast:** measured contrast is ≥ 7:1 for body text and ≥ 4.5:1 for large text, checked by the `pnpm a11y:contrast` script (SC-9).
- [ ] **Keyboard:** focus starts on the Cue title, and the tab order follows UX §9 (Pause, text size, For you, Play, then the bottom bar). Optional shortcuts work only inside the player and can be turned off.
- [ ] **"For you" disclosure:** tips, a Provenance line and the full safety line (FR-28).
- [ ] **Pause and A+:** Pause shows a calming screen (the calming Learned Favorite logic arrives in ticket 26). A+ steps the text size.
- [ ] **Navigation:** the Kit page's **Open Session N** now navigates here.
- [ ] **Prototype cleanup:** the prototype code from ticket 14 is deleted or folded in.

## Files / modules (PLAN §3.6)

- `src/app/p/[storyId]/session/[n]/page.tsx`
- `src/features/session-mode/Player.tsx`, `BottomBar.tsx`, `CueScreen.tsx`, `SensoryScreen.tsx`, `ForYou.tsx`, `PauseOverlay.tsx`, `TextSize.tsx`
- `scripts/a11y-contrast.ts`, and the `a11y:contrast` script in `package.json`
- New dependency: `@axe-core/playwright` (dev)

## Tests to write first (TDD)

- `e2e/golden.spec.ts` (PLAN §10.1, SC-1 and SC-5): clicks 1, 2 and 4 on the phone, tablet, ipad and desktop projects. Every rendered Cue has `data-entity-id`.
- `e2e/a11y.spec.ts` (PLAN §10.1, SC-9): axe reports 0 serious or critical issues in Session Mode, keyboard-only navigation works, targets are ≥ 48 px, and reduced motion is honoured.
- Unit tests for any pure helper (stage → Prompt slice) live in `src/domain`.

## Comments
