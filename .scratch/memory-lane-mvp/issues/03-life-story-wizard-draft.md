# 03: Life Story wizard with a resumable local draft

Status: ready-for-agent
Blocked by: 02
Slice: 2a Life Story (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

A Caregiver opens `/intake` and steps through About them, Places and Roots. They see the Reminiscence Window preview and gentle PII hints. They can close the tab and come back to the same step with their answers intact.

This ticket introduces the local-first store (ADR 0001) that every later client feature uses. Steps 4-6 are wired as shells; ticket 04 completes them.

## Acceptance criteria

- [ ] `createRepository(storage, migrations)` is implemented over a `KeyValueStorage` (`idb-keyval`), holding one versioned `StoreV1` key (PLAN §3.5). Its invariants:
  - Every write produces a new object.
  - `migrate()` runs on load.
  - Data from a future version opens read-only.
  - Invalid data goes to quarantine.
  - It falls back to `memoryStorage` when IndexedDB isn't available.
  - It sets no cookies (NFR-10).
- [ ] `useStore(select)` subscribes components to the store.
- [ ] `/intake?step=1..6` keeps the step in the URL. A stitched-thread stepper reads "Step 2 of 6". Every step has **Back**; optional steps also have **Skip** (FR-3).
- [ ] Step 1 collects the first name (letters, `'` and `-`, ≤ 30 characters) and the birth year (1920-1975). It shows a live preview: "Reminiscence Window: 1956 to 1976" (FR-7).
- [ ] Step 2 collects the Hometown, the Young-Adult City (optional) and the Care Location (optional), using the UX §3 labels. Step 3 collects heritage, language and occupation (all optional).
- [ ] `detectPiiRisk(text)` drives inline warnings for surname-like, address-like and diagnosis-like input. The privacy note copy follows UX §3 (FR-3, NFR-11).
- [ ] Client validation uses the shared `LifeStory` schema (`LifeStoryDraft` for partial values).
- [ ] The draft is saved after every step. Reloading at step 3 restores step 3 and its values (A16).
- [ ] On validation failure the error summary takes focus, and every field is labelled (NFR-1).

## Files / modules (PLAN §3.5, §3.6)

- `src/lib/store/storage.ts` (`KeyValueStorage`, idb-keyval adapter, `memoryStorage`), `repository.ts`, `migrations.ts`, `useStore.ts`
- `src/domain/pii.ts`
- `src/features/intake/*` (Wizard, Stepper, AboutStep, PlacesStep, RootsStep)
- `src/app/intake/page.tsx`
- New dependencies: `idb-keyval`, and `fake-indexeddb` (dev)

## Tests to write first (TDD)

- `src/lib/store/repository.test.ts` (new), through seam 7 `KeyValueStorage` with `fake-indexeddb`. Cover: migration from an empty store, quarantine of invalid data, a future version opening read-only, draft save and resume, and writes not mutating earlier state.
- `src/domain/pii.test.ts` (new): labelled positive and negative strings.
- `e2e/intake.spec.ts` (PLAN §10.1, FR-3/4/7): fill steps 1-3, reload, and assert the step and values are restored.

## Comments
