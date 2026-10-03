# 14: Session Mode prototype variants and check-in (b)

Status: ready-for-agent
Blocked by: 13
Slice: Prototype (between 3a-ii and 3b) · Size: S · Spec: ../spec.md

## What to build

Build three throwaway Session Mode directions, so the user can pick one at check-in (b) before ticket 17 builds the real player. They are reached at `/p/demo-margaret/session/1?variant=a|b|c`, using Margaret's current Kit. The `prototype` skill fits this ticket.

## Acceptance criteria

- [ ] **Variant a, "Turn the Page":** photo on the left, text on the right, a page-turn advance and stamp-button Reactions (UX §10).
- [ ] **Variant b, "The Window":** an edge-to-edge image, large captions, and a Reaction rail above the bottom bar.
- [ ] **Variant c, "Run of Show":** a running order, a "Show to the Person" view, and Prompts as a checklist.
- [ ] All three keep AAA contrast, 48 px targets, and Skip, Pause and End in the bottom bar (NFR-2).
- [ ] The prototype code lives in `src/features/session-mode/prototype/`. It is clearly marked throwaway, and ticket 17 deletes it or folds it in.
- [ ] **Human gate, check-in (b):**
  - The user picks a variant.
  - The user reviews `src/agent/templates.ts` (from ticket 09).
  - Record both decisions under Comments. **Ticket 17 must not start until the variant decision is recorded.**

## Files / modules (PLAN §10, UX §10)

- `src/features/session-mode/prototype/VariantA.tsx`, `VariantB.tsx`, `VariantC.tsx`
- `src/app/p/[storyId]/session/[n]/page.tsx` (temporary `variant` switch)

## Tests to write first (TDD)

- This is a throwaway prototype, so no unit tests are required.
- One Playwright smoke check that each `?variant=` renders the Cue title and the bottom bar (`e2e/prototype.spec.ts`, deleted with the prototype).

## Comments
