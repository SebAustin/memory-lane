# 27: Several Life Stories and a printable Kit

Status: ready-for-agent
Blocked by: 21
Slice: 8a Stories + print · Size: S · Spec: ../spec.md

## What to build

An activity coordinator can keep up to 10 Life Stories on one device. They can switch between them from the top bar and from `/about#privacy`, and delete a single one. The Kit page prints cleanly for staff who don't have the app.

## Acceptance criteria

- [ ] Up to 10 Life Stories are allowed (`StoreV1.lifeStories ≤ 10`). Adding an 11th is refused with a clear message (FR-8).
- [ ] The Life Story switcher sits in the top bar and in `/about#privacy`, and sets `activeStoryId`.
- [ ] Deleting one Life Story asks for confirmation and removes its profile, Kits and Session Logs (`deleteLifeStory`).
- [ ] A non-demo story URL opened on a device that doesn't have it shows "This Life Story lives on another device. Import it from a file." (UX §1).
- [ ] **Print (FR-25):** `@media print` on `/p/[storyId]/kit` drops the chrome and prints the Sessions, Cues, Prompts, tips, Avoid summary and safety line. `{name}` is filled in.

## Files / modules (PLAN §3.5, §3.6)

- `src/features/stories/StorySwitcher.tsx`, `src/features/stories/DeleteStoryDialog.tsx`
- `src/lib/store/repository.ts` (`deleteLifeStory`)
- `src/features/kit/print.css` (or a print block in the Kit styles)
- The top bar in `src/app/layout.tsx`

## Tests to write first (TDD)

- `e2e/stories.spec.ts` (PLAN §10.1, FR-8 and FR-25): create 2 stories, switch between them, delete one, and check the 10-story cap. Use `page.emulateMedia({media: 'print'})` to check that the chrome is hidden and the Prompts are visible.
- `src/lib/store/repository.test.ts`: `deleteLifeStory` cascades and doesn't mutate.
- Seams: 7 `KeyValueStorage`.

## Comments
