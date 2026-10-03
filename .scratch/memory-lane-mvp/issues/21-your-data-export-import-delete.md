# 21: Your data: export, import and delete all

Status: ready-for-agent
Blocked by: 20
Slice: 5b Your data (CORE) · Size: S · Spec: ../spec.md

## What to build

At `/about#privacy` the Caregiver can:
- export everything as one versioned JSON file;
- import it back, with a size cap, strict validation and a confirmation;
- delete all local data, with a clear confirmation.

Export → delete all → import restores the data exactly. The `/about` page also explains how the app works and its limits.

## Acceptance criteria

- [ ] **Export** downloads an `ExportFile` (`app: 'memory-lane'`, `schemaVersion`, `exportedAt`, `data: StoreV1`) (FR-26).
- [ ] **Import** (FR-26, SC-12):
  - Files > 512 KB are rejected with a clear message.
  - Validation is strict.
  - It shows a confirmation before replacing data.
  - It returns an `ImportResult`.
  - It runs `migrate()`.
- [ ] **Delete all** (FR-27) confirms with: "Delete all data? This removes every Life Story and Session Log from this device. Export first if you want a copy. [Export] [Delete everything]".
- [ ] **SC-10:** `exportAll → deleteAll → importAll` is deep-equal. No cookies are set (NFR-10).
- [ ] **Store banners:** when the store is quarantined, a future version or memory-only (no IndexedDB), a banner with **Export** appears (PLAN §6).
- [ ] **Privacy copy:** the privacy note follows UX §8 ("Life Stories stay in this browser…") and appears here and on the intake screen (FR-27, NFR-12).
- [ ] **`/about` shell:** How it works, evidence honesty ("research suggests small benefits"), Qloo, and limits.

## Files / modules (PLAN §3.5, §3.6)

- `src/app/about/page.tsx`
- `src/features/your-data/ExportButton.tsx`, `ImportDialog.tsx`, `DeleteAllDialog.tsx`, `StoreBanner.tsx`
- `src/lib/store/repository.ts` (`exportAll`, `importAll`, `deleteAll`)

## Tests to write first (TDD)

- `src/lib/store/roundtrip.test.ts` (PLAN §10.1, SC-10), with `fake-indexeddb`: the round trip is deep-equal, a 512 KB+ file is rejected, a schema-invalid file is rejected, and a future-version file is rejected or opened read-only.
- `e2e/privacy.spec.ts` (new): export, then delete all, then import through the UI. `context.cookies()` is empty.
- Seams: 7 `KeyValueStorage`.

## Comments
