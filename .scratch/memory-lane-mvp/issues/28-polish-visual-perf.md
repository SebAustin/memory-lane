# 28: Polish: final tokens, states and performance from 320 to 1920

Status: ready-for-agent
Blocked by: 27
Slice: 8b Polish · Size: M · Spec: ../spec.md

## What to build

Bring every surface to the "Family Album" design bar in both themes, with every interaction state designed. Prove the design with screenshots, axe and Lighthouse at every breakpoint.

## Acceptance criteria

- [ ] **Tokens and fonts:**
  - The UX §7 tokens are pasted into `src/styles/tokens.css` and used everywhere, with no hardcoded palette or spacing.
  - Fraunces and Atkinson Hyperlegible Next are self-hosted via `next/font/local`, using the Latin subset and `swap`. Verify the family name (UX open risk 4) (NFR-9).
- [ ] **Component states:** every UX §4.8 component has default, hover, focus-visible, active, disabled, loading and error states. Light and dark themes both feel intentional.
- [ ] **Visual (SC-8, NFR-4):** `toHaveScreenshot` on chromium at 320, 768, 1024 and 1440 px for the landing page, the Kit, Session Mode and Compare. There is no horizontal overflow anywhere from 320 to 1920 px.
- [ ] **Accessibility (SC-9):** axe reports 0 serious or critical issues on every route. Lighthouse a11y is ≥ 95. The golden path completes keyboard-only and with reduced motion.
- [ ] **Performance (NFR-5, NFR-6):** `pnpm lhci` (mobile) on the landing page, the Kit and Session Mode meets LCP < 2.5 s, INP < 200 ms, CLS < 0.1, FCP < 1.5 s and TBT < 200 ms. Bundle budgets: the landing page < 150 kB JS and < 30 kB CSS; app pages < 300 kB JS and < 50 kB CSS (gzipped).
- [ ] **Motion:** transform and opacity only. Reduced motion leaves fades of ≤ 120 ms (NFR-3).

## Files / modules (UX §4, §7, §9)

- `src/styles/tokens.css`, `src/app/fonts/*`, `src/app/layout.tsx`
- Component styles under `src/features/*`
- `e2e/visual.spec.ts`, `e2e/a11y.spec.ts`, `lighthouserc.json`, and the `lhci` script
- New dependency: `@lhci/cli` (dev)

## Tests to write first (TDD)

- `e2e/visual.spec.ts` (PLAN §10.1, SC-8): baselines first, then the design work.
- `e2e/a11y.spec.ts` (PLAN §10.1, SC-9): every route, keyboard and reduced motion.
- An overflow check: `document.documentElement.scrollWidth <= innerWidth` at 320, 375, 768, 1024, 1440 and 1920 px.

## Comments

- 2026-10-03 (orchestrator, visual check of slice 1): the featured 2×2 Cue card on the Kit page is too dominant at 1440px. The monogram fills most of the viewport. Cap the featured card size, or make it 2×1 at wide breakpoints.

- 2026-10-03 (builder, slice 1 review): **L9 and L10, polish debt.** L9: the landing hero stack uses percentages tuned at 1440 and 375, so check 320, 768 and 1920 for print overlap. L10: Atkinson Hyperlegible Next has no fallback metrics (`next build` warns 'Failed to find font override values'), so measure CLS from the font swap and consider `next/font/local` with vendored files, which also lets `next build` run offline.
