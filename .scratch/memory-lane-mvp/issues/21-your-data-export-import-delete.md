# 21: Your data: export, import and delete all

Status: done (worktree branch, awaiting merge)
Blocked by: 20
Slice: 5b Your data (CORE) · Size: S · Spec: ../spec.md

## What to build

At `/about#privacy` the Caregiver can:
- export everything as one versioned JSON file;
- import it back, with a size cap, strict validation and a confirmation;
- delete all local data, with a clear confirmation.

Export → delete all → import restores the data exactly. The `/about` page also explains how the app works and its limits.

## Acceptance criteria

- [x] **Export** downloads an `ExportFile` (`app: 'memory-lane'`, `schemaVersion`, `exportedAt`, `data: StoreV1`) (FR-26).
- [x] **Import** (FR-26, SC-12):
  - Files > 512 KB are rejected with a clear message.
  - Validation is strict.
  - It shows a confirmation before replacing data.
  - It returns an `ImportResult`.
  - It runs `migrate()`.
- [x] **Delete all** (FR-27) confirms with: "Delete all data? This removes every Life Story and Session Log from this device. Export first if you want a copy. [Export] [Delete everything]".
- [x] **SC-10:** `exportAll → deleteAll → importAll` is deep-equal. No cookies are set (NFR-10).
- [x] **Store banners:** when the store is quarantined, a future version or memory-only (no IndexedDB), a banner with **Export** appears (PLAN §6).
- [x] **Privacy copy:** the privacy note follows UX §8 ("Life Stories stay in this browser…") and appears here and on the intake screen (FR-27, NFR-12).
- [x] **`/about` shell:** How it works, evidence honesty ("research suggests small benefits"), Qloo, and limits.

## Files / modules (PLAN §3.5, §3.6)

- `src/app/about/page.tsx`
- `src/features/your-data/ExportButton.tsx`, `ImportDialog.tsx`, `DeleteAllDialog.tsx`, `StoreBanner.tsx`
- `src/lib/store/repository.ts` (`exportAll`, `importAll`, `deleteAll`)

## Tests to write first (TDD)

- `src/lib/store/roundtrip.test.ts` (PLAN §10.1, SC-10), with `fake-indexeddb`: the round trip is deep-equal, a 512 KB+ file is rejected, a schema-invalid file is rejected, and a future-version file is rejected or opened read-only.
- `e2e/privacy.spec.ts` (new): export, then delete all, then import through the UI. `context.cookies()` is empty.
- Seams: 7 `KeyValueStorage`.

## Comments

- 2026-10-04 (builder): built on branch `worktree-agent-ac36c1451ea602e1f`. Store: `exportAll`, `exportUnreadable`, `previewImport`, `importAll`, `deleteAll` in `repository.ts`; strict, size-capped, all-or-nothing parsing in `importFile.ts`. UI: `/about` with `#privacy`, `ExportButton`, `ImportDialog` (choose, preview, confirm), `DeleteAllDialog` (UX copy, no timers, Cancel focused first), `StoreBanner` (read-only, unreadable and set-aside-failed, memory-only, save-failed; each with Export). The intake's `StoreNotices` is replaced by `StoreBanner`, and its privacy note links to Your data. Top bar gains "How it works" and "Your data".
- Decisions: a future-version file is rejected (not opened read-only). Import is refused while the store is read-only, so unreadable data is never overwritten; Delete all is the way out. Export in a read-only or quarantined banner downloads the unreadable data wrapped in the same envelope.
- Known limit: a store holding many Kits can exceed the 512 KB import cap, so its own export would be refused on re-import. Raise the cap or trim exports in a later ticket.
- review fixes H1/H2/M6/L3 (from the coordinator's review): H1 atomic `update()` + BroadcastChannel, H2 read-only when the quarantine write fails, M6 3 s load timeout, L3 structural sharing. Tests in `src/lib/store/robustness.test.ts`. L4 (per-record quarantine) deferred, see PLAN section 15 item 6.
