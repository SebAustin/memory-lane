# 03: Life Story wizard with a resumable local draft

Status: resolved
Blocked by: 02
Slice: 2a Life Story (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

A Caregiver opens `/intake` and steps through About them, Places and Roots. They see the Reminiscence Window preview and gentle PII hints. They can close the tab and come back to the same step with their answers intact.

This ticket introduces the local-first store (ADR 0001) that every later client feature uses. Steps 4-6 are wired as shells; ticket 04 completes them.

## Acceptance criteria

- [x] `createRepository(storage, migrations)` is implemented over a `KeyValueStorage` (`idb-keyval`), holding one versioned `StoreV1` key (PLAN §3.5). Its invariants:
  - Every write produces a new object.
  - `migrate()` runs on load.
  - Data from a future version opens read-only.
  - Invalid data goes to quarantine.
  - It falls back to `memoryStorage` when IndexedDB isn't available.
  - It sets no cookies (NFR-10).
- [x] `useStore(select)` subscribes components to the store.
- [x] `/intake?step=1..6` keeps the step in the URL. A stitched-thread stepper reads "Step 2 of 6". Every step has **Back**; optional steps also have **Skip** (FR-3).
- [x] Step 1 collects the first name (letters, `'` and `-`, ≤ 30 characters) and the birth year (1920-1975). It shows a live preview: "Reminiscence Window: 1956 to 1976" (FR-7).
- [x] Step 2 collects the Hometown, the Young-Adult City (optional) and the Care Location (optional), using the UX §3 labels. Step 3 collects heritage, language and occupation (all optional).
- [x] `detectPiiRisk(text)` drives inline warnings for surname-like, address-like and diagnosis-like input. The privacy note copy follows UX §3 (FR-3, NFR-11).
- [x] Client validation uses the shared `LifeStory` schema (`LifeStoryDraft` for partial values).
- [x] The draft is saved after every step. Reloading at step 3 restores step 3 and its values (A16).
- [x] On validation failure the error summary takes focus, and every field is labelled (NFR-1).

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

### 2026-10-04, builder (Claude Opus 5.5)

**Done.** Red-first at the seams the ticket names: the store through `KeyValueStorage` with `fake-indexeddb`, `detectPiiRisk` with labelled strings, the step validation, then the wizard in Testing Library and in Playwright.

- **Gates, all local and green:**
  - `pnpm lint` (0 errors, 0 warnings), `pnpm typecheck`, `pnpm build` (6 routes), `pnpm scan:bundle` (34 files clean).
  - `pnpm test:coverage`: 35 files, 465 tests. 98.8% statements, 94.0% branches. The `src/domain/**` gate holds with `pii.ts` in it.
  - `pnpm test:e2e`: 152 passed, 4 skipped (the Tab-key tests on WebKit), on `phone`, `tablet`, `ipad` and `desktop`.
  - New tests: 187 unit (store 59, `pii` 50, intake form 54, wizard 22, page 2) and 17 e2e specs per browser.
- **What exists:**
  - **Store** (`src/lib/store/`): `storage.ts` (`KeyValueStorage` with a `kind`, `memoryStorage`, a lazy `idbStorage`, `defaultStorage`), `migrations.ts` (`migrate`, `EMPTY_STORE`, fixed-code reasons), `repository.ts` (`createRepository`, `ReadOnlyStoreError`), `useStore.ts` (`useStore`, `useStoreStatus`, `useRepository`, `StoreProvider`).
  - **PII hints:** `src/domain/pii.ts`.
  - **Wizard:** `src/features/intake/*` and `src/app/intake/page.tsx`. Steps 1-3 are real. Steps 4-6 are wired into the stepper and URL as honest shells ("arrives in the next update").
- **Store behaviour:**
  - Every write builds a new state, validates the whole `StoreV1`, deep-freezes it, then saves. Writes run in call order.
  - Invalid data is copied to `memory-lane:quarantine` (`{at, reason, raw}`) and the store starts empty. The next save replaces the bad main key, so the quarantine copy is the only one left.
  - A future version opens **empty and read-only**: the app can't read it, so it shows nothing and refuses writes with `ReadOnlyStoreError`. The stored data is never touched.
  - If IndexedDB can't be read, the repository switches to `memoryStorage` and says so in its status. `defaultStorage()` does the same when `indexedDB` is undefined.
  - If a save fails, the change stays in memory, `status.saveFailed` is set, and the promise rejects. The next good save clears the flag.
  - Reads wait for `load()`. Before it finishes, `useStore` sees the empty store and `useStoreStatus().phase` is `loading`.
  - No cookies: a jsdom test and an e2e check (`context.cookies()` is empty).
- **Wizard behaviour:**
  - **URL and guard.** The step lives in `?step=` (native `history.pushState`, which Next syncs with `useSearchParams`). `/intake` with no step resumes at the draft's step. A link past an unfinished step (for example `?step=5` with nothing filled in) is moved back to the furthest step the draft allows.
  - **Saving.** Next saves only after the step validates. Back and Skip save whatever is valid, then move. The wizard awaits the save before it navigates, so a reload straight after a click can't lose it.
  - **Errors.** A failed step puts focus on the error summary, which links to each field. Each field also has its own inline error. Moving to a new step puts focus on its h1.
  - **Preview.** The Reminiscence Window preview reuses `ReminiscenceTimeline` and shows "Reminiscence Window: 1956 to 1976" once the year is four valid digits. On a phone it sits above the form on step 1 and below it on later steps.
  - **Hints.** PII hints are per field: a surname hint only on First name, address and diagnosis hints elsewhere. They are advisory, never block, and don't repeat what was typed.
- **Deviations and decisions:**
  - **Zod `jitless` in the browser.** Zod probes `new Function("")` to detect eval, and our CSP reports that as a violation even though the error is caught. The contracts now import `z` from `src/contracts/z.ts`, which sets `z.config({ jitless: true })` only when `window` exists. Server parsing is unchanged. The e2e CSP check caught this the first time contracts ran in the browser.
  - **`detectPiiRisk(text, { kinds? })`.** PLAN §3.2 has one argument. The optional `kinds` filter is compatible, and without it "New Orleans" would trip the surname rule.
  - **Repository surface.** `exportAll`, `importAll` and `deleteAll` are left for ticket 21. Ticket 03 has the writes a wizard and Kit need. The status object (`readOnly`, `quarantined`, `storage`, `saveFailed`) is in place for ticket 21's banners, and the wizard shows its own short notices for the same states until then.
  - **`SecondaryButton`** was added to `MessagePage.tsx` (Back and Skip), plus a disabled style for the primary button.
  - **Step 2 "optional".** Hometown is required, so step 2 has Back but no Skip. Skip appears on steps 3 and 5 only.
  - **Step 6** shows a disabled "Build Margaret's Kit" until ticket 04 wires it.
  - **Existing test changed.** `e2e/golden.spec.ts` "reaches the Life Story stub" now expects the wizard's step-1 h1. The stub case in `pages.test.tsx` moved to `src/app/intake/page.test.tsx`, which mocks `next/navigation`.
- **Not done, by design:**
  - Seeds, the Avoid List, Dementia Stage, review and the final "Build Kit" (ticket 04).
  - Autosave on every keystroke. A draft is saved when a step is left, as the ticket says.
  - Cross-tab sync. Two tabs on one draft is last write wins.
  - Axe and visual-regression screenshots (ticket 28). I checked light, dark, 320, 375, 768 and 1440 by eye.
- `eslint .` also walks `.claude/worktrees/` (a second builder's checkout, not in CI). I linted with `--ignore-pattern ".claude/**"`. The uncommitted `.gitignore` line for that folder isn't mine and isn't in this commit.

