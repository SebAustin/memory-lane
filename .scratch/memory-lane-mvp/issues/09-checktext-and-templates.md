# 09: `checkText` and the vetted templates

Status: ready-for-agent
Blocked by: 08
Slice: 3a-i Validator + templates (CORE), part 1 of 3 · Size: M · Spec: ../spec.md

## What to build

This ticket builds the deterministic text guard and the library of vetted replacement strings it falls back on. A labelled test table proves that it catches quiz Prompts, claims, Avoid terms, sensitive themes and invented names, and that it leaves good, human titles alone. Every template passes the guard.

> This only needs domain types. It could be pulled forward to start right after 02 if parallel work is wanted. PLAN sequences it after 2b-ii.

## Acceptance criteria

- [ ] `checkText(text, scope, ctx)` follows PLAN §3.2 R4, as amended by §14.6 (FR-12, SC-7).
  - **Body** scope (Prompts, caregiverTips, sensoryActivities, whyThis) checks:
    - the quiz regex ("Do you remember…?", "What year…?", "Who was…?");
    - the claim lexicon ("therapy", "heal", "improve memory"…);
    - Avoid List terms, including song titles;
    - the sensitive-theme lexicon, unless opted in;
    - quoted strings **that match no registry name**;
    - invented names: Title-Case runs of 2+ words not on the allow-list.
  - **Heading** scope (title, theme) checks quoted strings, Avoid terms, the sensitive lexicon and the claim lexicon **only**. The Title-Case rule never applies to headings.
  - **Allow-list:** registry names, Seed names, Learned Favorite names, fingerprint tag names, Hometown, Young-Adult City, Care Location, days, months, holidays and sentence-initial words.
- [ ] The labelled table has **70 strings** and includes these OK cases:
  - the UX titles "Saturday Night at the Pictures, 1962", "Mama's Kitchen", "Sunday Best at the Grand Ole Opry" and "Christmas on Beale Street";
  - the body string `Tell me about seeing "Pillow Talk"` when Pillow Talk is in the registry.
- [ ] `SESSION_FORMATS` follows the PLAN §3.2 table: early `conversation` 4-6/≤3/≤25/≥1; middle `mixed` 4-6/≤2/≤18/≥1; late `sensory` 3-5/≤1/≤12/≥2 (FR-6).
- [ ] `templates.ts` is keyed by domain × stage, and **every template passes `checkText`**. Templates use the `{name}` placeholder and never presume a living spouse or parent (R12). Minimums:
  - ≥ 3 Prompts per domain × stage;
  - ≥ 6 sensory activities per stage;
  - ≥ 8 Session titles and themes;
  - Caregiver tips.
- [ ] **Layering decision (spec):** `domain` stays pure. `validateKit` (ticket 10) receives templates through its context instead of importing `src/agent/templates.ts`.
- [ ] **Human review:** the user reviews `templates.ts` at check-in (b) (ticket 14).

## Files / modules (PLAN §3.2, §3.3)

- `src/domain/checkText.ts`, `src/domain/lexicons.ts` (extended from ticket 07), `src/domain/sessionFormats.ts`
- `src/agent/templates.ts`

## Tests to write first (TDD)

- `src/domain/checkText.test.ts` (PLAN §10.1, SC-7): the 70-string labelled table, split by scope, with an opt-in variant for the sensitive lexicon.
- `src/domain/templates.test.ts` (PLAN §10.1, SC-7): checks the minimums and runs every template through `checkText` in its scope.
- Seams: none beyond plain pure functions.

## Comments
