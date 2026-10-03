# Memory Lane: Requirements

Status: intake, 2026-10-03. Deadline 2026-10-30 23:45 ET (27 days). Terms follow `CONTEXT.md` exactly. Assumptions are `A#` in `ASSUMPTIONS.md`. Product features 1-10 refer to the approved plan (`~/.claude/plans/use-the-mattpodock-skills-quirky-raven.md`).

## 1. Problem and users

**Problem.** Nearly 13 million Americans provide unpaid care for someone with Alzheimer's or another dementia (more than 19 billion hours in 2025) [1]. Reminiscence therapy (discussing past experiences with tangible prompts such as photographs or music) shows small benefits for quality of life, cognition, communication and possibly mood [2]. Personalized music programs in nursing homes are linked to fewer disruptive behaviours and less antipsychotic and antianxiety medication, though that study found no significant mood gain [3]. Music from the "reminiscence bump" (roughly ages 15-24 in the music literature) evokes the strongest autobiographical memories [4]. The blocker is preparation, not belief. Building a Person-specific set of era-correct, place-correct Cues by hand is slow, so most Caregivers fall back on generic "1950s hits" playlists that miss the Person's actual taste and can hit painful topics.

**Job to be done.** "Give me a week of Sessions that feel like this specific Person's youth, tell me why each Cue was chosen, keep me away from what might upset them, and get better after each Session."

**Target Caregivers** (one app, one flow):

| Caregiver | Context | What they need |
|---|---|---|
| Family caregiver (primary persona) | Home, tablet or phone, tired, little time | Setup in minutes; a Session they can run beside the Person; reassurance that nothing will distress |
| Memory-care activity coordinator | Care home, runs Sessions for many Persons | Several local Life Stories; printable Kit for staff; Provenance they can defend to families |
| Music therapist | Clinical or community setting | Era- and place-correct music Cues with reasons; Avoid List honoured; export to their own notes |

**Why Qloo is structurally required.** The product needs three signals at once: an age cohort, a Hometown location signal and cross-domain affinity from a few Seeds. Qloo's taste graph supplies all three over music, film, TV, books, places and brands. An LLM alone gives stereotypes and can invent works. See ADR 0003. The Baseline Kit (feature 8) shows the difference side by side.

**Evidence honesty.** The Cochrane review reports small effects and mixed carer outcomes. In two large joint-reminiscence studies carers became slightly more anxious [2]. The app must therefore claim "research suggests small benefits", never cure or treatment, and must make stopping or skipping a Cue effortless.

## 2. Functional requirements

Priority: M = must (winning core, plan slices 1-6), S = should (slices 7-8), C = could (stretch).

### Entry and Life Story (features 1, 2, 3)
| ID | Requirement | Feat | Pri |
|---|---|---|---|
| FR-1 | One click on the landing page loads the demo persona "Margaret, b. 1946, Memphis, Patsy Cline and Doris Day films" and opens her Kit flow. No signup, no key entry. | 1 | M |
| FR-2 | The demo persona works with zero configuration, from a warm cache or fixtures if Qloo is unreachable, and says so (see FR-24). | 1 | M |
| FR-3 | Life Story intake (guided wizard; a conversational mode is optional) collects first name only, birth year, Hometown, Young-Adult City, heritage and language, occupation, 2-5 Seeds, Avoid List and Dementia Stage. Validated with a shared schema client and server. Free-text fields warn against entering surnames, addresses or diagnoses. | 2 | M |
| FR-4 | Seed resolution calls Qloo `/search`. A single confident match is confirmed with an image. An ambiguous match returns `needs_input` and shows disambiguation chips (image, type, year). The app never forces a match and never accepts an unresolved Seed. | 2 | M |
| FR-5 | Avoid List accepts entities (resolved through Qloo) and free-text topics (mapped to Qloo tags where possible). Each becomes an Exclusion applied to every Qloo call. Unmappable topics also constrain Prompt generation (FR-11). | 2 | M |
| FR-6 | Dementia Stage (early, middle, late) changes Session format only: early is conversation-led; middle mixes Cues with shorter Prompts; late is sensory-led with minimal speech demands. It does not change which Cues are selected. | 2 | M |
| FR-7 | The Reminiscence Window is computed from birth year (ages 10-30), shown to the Caregiver in plain language ("1956-1976") and used as `filter.release_year` for film, TV and books. The age cohort signal is `55_and_older`. Hometown is the music location signal. | 3 | M |
| FR-8 | The Caregiver can keep several local Life Stories (up to 10), switch between them and delete one. | 2 | S |

### Kit generation and trust (features 4, 5, 8)
| ID | Requirement | Feat | Pri |
|---|---|---|---|
| FR-9 | An agent tool loop (Claude through the AI Gateway) calls Qloo tools (`search_entities`, `get_affinities`, `get_tags`) and composes a Kit of 3-4 themed Sessions (for example "Saturday Night at the Pictures, 1962"). | 4 | M |
| FR-10 | Each Session contains Cues across music, film/TV, books, dishes and places, and brands/objects, plus Prompts, sensory activities and Caregiver tips, formatted per Dementia Stage and sized for 20-45 minutes. | 4 | M |
| FR-11 | **Zero non-Qloo Cues.** A validator drops any Cue whose `entity_id` was not returned by Qloo in the same run. Every Cue carries a Qloo `entity_id`. The LLM may only select, order, theme and explain. Music Cues are Qloo artist entities. Track titles are never presented as Cues (see A12). | 4 | M |
| FR-12 | Prompts are open and failure-free. A guard rejects and regenerates Prompts that quiz recall ("Do you remember...?", "What year...?", "Who was...?"). | 4 | M |
| FR-13 | The Kit is diversified: no Cue is repeated across Sessions in one Kit, and Sessions differ in theme and domain mix (`diversify.by` and `diversify.take`, plus a post-check). | 4 | S |
| FR-14 | A taste fingerprint ("what Margaret's taste is made of") is built from `filter.type=urn:tag` over the Seeds and shown in the Kit overview. | 4 | S |
| FR-15 | A live agent trace panel streams every tool call and result summary as it happens ("Searching Qloo for Patsy Cline", "Expanding music affinities, 55+, Memphis"). It is collapsible, screen-reader friendly, and shows Qloo call count and cache hits. | 5 | M |
| FR-16 | Every Cue shows "Why this?" Provenance: Qloo affinity score, the Seed(s) from `explainability`, and the cohort, Hometown and Reminiscence Window signals used. Copy is aggregate ("people who share Margaret's era and favorites loved...") and never a claim about the individual. | 8 | M |
| FR-17 | A "Without Qloo" toggle shows the Baseline Kit beside the Qloo-grounded Kit, marks Baseline entries that cannot be resolved to a Qloo `entity_id`, and shows overlap and era-match counts. The Baseline Kit is labelled comparison-only and cannot be run as a Session. | 8 | M |

### Running and learning (features 6, 7)
| ID | Requirement | Feat | Pri |
|---|---|---|---|
| FR-18 | Session Mode is a tablet-first player: one Cue per screen in large type and high contrast, with image, a play-music link (external search link, no embedded playback), Prompts, and always-visible Skip and End Session controls. Works by touch and keyboard. | 6 | M |
| FR-19 | Session Mode keeps working offline from the already generated Kit (no Qloo or LLM call during a Session). Keeping the screen awake is best effort. | 6 | S |
| FR-20 | After a Session the Caregiver records a Reaction (Engaged, Neutral, Distressed) per Cue, with a one-tap flow. Reactions can also be tapped live, and nothing is mandatory. | 7 | M |
| FR-21 | Engaged Cues become Learned Favorites (weighted `signal.interests.entities`). Distressed Cues become Exclusions (`filter.exclude.entities` plus down-weighted tags). Both persist in the Taste Profile and Session Log. | 7 | M |
| FR-22 | The next Kit regenerates from the updated Taste Profile and shows a visible "learned from last session" diff (added Learned Favorites, removed Cues, new Exclusions). | 7 | M |

### Sharing, data, resilience (features 9, 10, cross-cutting)
| ID | Requirement | Feat | Pri |
|---|---|---|---|
| FR-23 | Shared listening: a Visitor enters their own 2-5 Seeds, and `/v2/analysis/compare` produces "Cues you'll both enjoy" with the overlap explained. Visitor data is not stored by default. | 9 | C |
| FR-24 | Degraded modes are visible, never silent. Qloo 429/5xx shows a "cached result" badge. Qloo or LLM outage on the demo persona falls back to the precomputed warm cache. Empty results (`empty`) offer a concrete next step (widen the Reminiscence Window, add a Seed). | all | M |
| FR-25 | Print view: a clean printable Kit (Cues, Prompts, tips, Avoid List summary) with no app chrome. | 10 | S |
| FR-26 | Export and import of a Life Story, Taste Profile and Session Log as one versioned JSON file. Import is schema-validated and size-limited. | 10 | M |
| FR-27 | "Delete all data" clears every local record in one action, with a confirmation. A plain-language privacy note is on the intake screen and in Settings. | 10 | M |
| FR-28 | Every screen carries "not medical advice" framing in the footer and in Caregiver tips. The app suggests stopping a Session when a Distressed Reaction is logged. | all | M |

## 3. Non-functional requirements

### Accessibility
- **NFR-1** WCAG 2.2 AA app-wide: semantic landmarks, visible focus, full keyboard operation, labelled controls, no colour-only meaning (Reaction states use icon, text and colour).
- **NFR-2** Session Mode meets AAA contrast (7:1 body, 4.5:1 large text), type of at least 24 px body, touch targets of at least 48 px, and no time-limited interactions.
- **NFR-3** `prefers-reduced-motion` is honoured everywhere. Motion uses `transform` and `opacity` only. The agent trace and Session Mode must be usable with a screen reader.
- **NFR-4** Reflows without horizontal scroll from 320 px to 1920 px. Tablet portrait and landscape are first-class.

### Performance
- **NFR-5** Core Web Vitals on landing, Kit and Session Mode (mobile profile): LCP < 2.5 s, INP < 200 ms, CLS < 0.1, FCP < 1.5 s, TBT < 200 ms.
- **NFR-6** Bundle budgets: app pages under 300 kB JS gzipped and under 50 kB CSS; landing under 150 kB JS and 30 kB CSS. Heavy libraries are dynamically imported.
- **NFR-7** Kit generation streams. The first trace event appears in under 2 s. The demo persona Kit renders in under 3 s from warm cache and under 45 s p90 live (A19).
- **NFR-8** Qloo calls for independent domains run in parallel. Responses are cached (LRU plus Vercel runtime cache) with the key `(endpoint, normalized params)` and no personal fields.
- **NFR-9** Fonts: at most two families, `font-display: swap`, subset. Images have explicit dimensions and lazy loading, except the hero image.

### Privacy (ADR 0001)
- **NFR-10** Life Stories, Taste Profiles and Session Logs live only in the browser (A16). No accounts, no server database, no server-side logs of request bodies. Cookies are not set.
- **NFR-11** Data minimisation on the wire: the first name never goes to Qloo or the LLM (a placeholder is substituted and re-inserted client-side). Surname-like and address-like input is rejected or warned on. Requests carry only what the call needs.
- **NFR-12** Export and delete are first-class (FR-26, FR-27). Shared-device risk is stated in the privacy note.

### Security
- **NFR-13** `QLOO_API_KEY` and `AI_GATEWAY_API_KEY` exist only in server env. No key can be found in the client bundle, source maps, logs or git history.
- **NFR-14** All API routes validate input with Zod (type, length, enum, range) and reject with a 400 and a safe message. Qloo and LLM responses are validated at the boundary.
- **NFR-15** Rate limiting on every API route (per IP, plus a global LLM budget cap, A18). Over-limit requests receive a 429 with `Retry-After`.
- **NFR-16** Production CSP with nonces, HSTS, `nosniff`, `Referrer-Policy`, and a restrictive `Permissions-Policy`. No `dangerouslySetInnerHTML`. Qloo image URLs are allow-listed by hostname. Error messages never leak upstream bodies or keys.
- **NFR-17** LLM output is rendered as text, never HTML. Prompt-injection from free-text Life Story fields cannot add Cues (FR-11) or override the Avoid List (Exclusions are enforced in Qloo calls and post-validation, not only in the prompt).

### Reliability
- **NFR-18** Qloo 429 and 500/502/503/504 trigger exponential backoff from 250 ms with jitter, at most 3 retries, then degrade (FR-24). The Qloo client returns the kit's envelope (`ok | empty | needs_input | partial | degraded | error`) plus Provenance.
- **NFR-19** `QLOO_MODE=fixture|live` switches adapters without code change. Fixtures are recorded from real calls once the key arrives. A cached demo fallback exists for the demo persona.
- **NFR-20** Partial failure is tolerated. If one domain fails, the Kit still renders other domains and marks the gap (`partial`).
- **NFR-21** A per-domain Qloo contract smoke test (`scripts/qloo-smoke.ts`) catches silently ignored parameters (200 with empty results).

### Reproducibility and quality
- **NFR-22** A clean clone runs in fixture mode with no keys: `pnpm install`, `cp .env.example .env.local`, `pnpm dev`. Live mode needs only the two documented keys. Node 22+ and pnpm are pinned (`packageManager`, `.nvmrc`).
- **NFR-23** CI runs lint, typecheck, unit/integration tests with coverage, and Playwright E2E. Coverage is at least 80% on the domain and Qloo modules.
- **NFR-24** Files are under 800 lines, domain logic is pure and immutable, and the Qloo module hides behind one `QlooClient` seam (`HttpQlooClient`, `FixtureQlooClient`).
- **NFR-25** Provenance of the build is documented: public repo, MIT license shown in the GitHub About section, redacted request-to-result walkthrough, known limitations and responsible-data section in the README (per kit `SUBMISSION.md`).
- **NFR-26** Browsers: current Chrome, Safari (including iPad Safari), Firefox and Edge.

## 4. Non-goals

- No accounts, authentication, or multi-user sync.
- No medical advice, diagnosis, treatment claims, symptom tracking, or dosing or medication guidance.
- No server database or server-side storage of Life Stories, Reactions or Session Logs.
- No native iOS or Android app (responsive PWA-style web only; no app-store work).
- No audio hosting, streaming-service integration or embedded playback. Music Cues link out to an external search.
- No track-level music Cues, since Qloo returns artists (A12).
- No real-time video or voice, no speech recognition of the Person.
- No claims that Qloo results describe an individual, and no use of Person data to train anything.
- No i18n beyond English UI (heritage and language shape content only, A11).
- Out of scope for v1: family-sharing, multi-Caregiver collaboration, clinical outcome measurement, integrations with care-home records.

## 5. Success criteria

Each criterion names its check. T = automated test, M = manual check, E = eval script (`EVALS.md`).

| ID | Criterion | Check |
|---|---|---|
| SC-1 | **Zero non-Qloo Cues.** 100% of Cues across all Sessions of 5 personas (different decades and cities) have an `entity_id` present in that run's Qloo responses. A validator unit test injects a fabricated Cue and asserts it is dropped, and an E2E test asserts every rendered Cue has a `data-entity-id`. | T, E |
| SC-2 | **Qloo is load-bearing.** On the demo persona and 4 others, versus the Baseline Kit: at least 90% of Qloo Film/TV/Book Cues fall inside the Reminiscence Window; at most 60% title overlap with the Baseline Kit; and Baseline entries that fail Qloo resolution are surfaced in the UI. Thresholds are calibrated once live data exists (A20). | E |
| SC-3 | **Exclusions honoured.** 0 Cues match any Avoid List entity or tag, across 5 personas, with at least one Avoid List entry each. A Distressed Cue never appears in the next Kit. | T, E |
| SC-4 | **Reaction loop visibly improves the Kit.** After at least 2 Engaged Reactions, the regenerated Kit has at least 1 Cue whose Provenance names a Learned Favorite, and the diff panel lists the added Learned Favorites and Exclusions. | T (E2E) |
| SC-5 | **Golden path.** On a fresh incognito browser: landing, demo persona, Kit, Session Mode, Reactions, improved Kit is completable in at most 6 clicks and without typing, on phone (375 px) and tablet (768 px). | T (Playwright), M |
| SC-6 | **Provenance coverage.** 100% of Cues expose "Why this?" with the affinity score and at least one signal or Seed. With no Seeds, Provenance says "signals only". | T |
| SC-7 | **Prompt safety.** 0 generated Prompts match quiz patterns (regex plus LLM-judge) over 5 personas. Late-stage Sessions have fewer Prompts and at least 2 sensory activities per Session. | E |
| SC-8 | **Performance.** Lighthouse mobile on landing, Kit and Session Mode meets NFR-5 and NFR-6. Playwright screenshots exist at 320, 768, 1024 and 1440 px with no horizontal overflow. | T, M |
| SC-9 | **Accessibility.** axe-core reports 0 serious or critical violations on every route. Lighthouse a11y is at least 95. Session Mode measured contrast is at least 7:1, touch targets at least 48 px. A keyboard-only run and a reduced-motion run complete the golden path. A VoiceOver spot check on Session Mode passes. | T, M |
| SC-10 | **Privacy.** Automated test: no outbound request body to Qloo or the LLM contains the first name or a raw Life Story. The server has no DB dependency. No cookies are set. Export then Delete all then Import restores the data exactly. | T |
| SC-11 | **Secrets.** A secret scan of the repo history and the built client bundle and source maps finds 0 occurrences of `QLOO_API_KEY` or `AI_GATEWAY_API_KEY` values. | T (CI), M |
| SC-12 | **Input validation and rate limiting.** Malformed payloads to every API route return 400. Exceeding the limit returns 429 with `Retry-After`. Oversized import files are rejected. | T |
| SC-13 | **Resilience.** With a mocked Qloo 429, the client backs off, retries at most 3 times, then serves cache with a visible badge. With Qloo fully down, the demo persona still renders. One failed domain yields a `partial` Kit, not an error page. | T |
| SC-14 | **Reproducible setup.** On a clean machine (or fresh container), `git clone`, install, copy env, `pnpm dev` shows the demo persona Kit in fixture mode in under 10 minutes with no keys. CI is green on the tagged release. | M, T |
| SC-15 | **Test bar.** Lint and typecheck pass. At least 80% coverage on domain and Qloo modules. Per-domain contract smoke test passes live (movie, tv_show, book, artist, place, brand, tag). | T |
| SC-16 | **Submission package.** Live Vercel URL loads in incognito. The public repo shows the MIT license in the GitHub About section. The README has "Why Qloo", architecture diagram, redacted request-to-result walkthrough, known limitations and responsible-data sections. The Devpost text is drafted. | M |

## 6. Judging criteria mapped to requirements

| Criterion | Requirements that win it | Evidence |
|---|---|---|
| 1. Technological implementation | FR-4, 5, 7, 9, 11, 14, 16, 21, 23; NFR-8, 18-21, 24 | Seven Qloo endpoints or signals used together (search, insights with five signal types, tags, explainability, exclude filters, `filter.results.entities` re-rank, compare). Typed client, validator, agent loop, contract tests. SC-1, SC-2, SC-13, SC-15 |
| 2. Design | FR-1, 6, 15, 18, 19, 22, 24, 25; NFR-1-4, 5-7, 9 | Complete flow from onboarding to a learned second Kit, with empty, error and print states and an accessible, tablet-first Session Mode. SC-5, SC-8, SC-9 |
| 3. Potential impact | Section 1 users; FR-3, 5, 8, 12, 28; NFR-10-12 | Real audience (millions of unpaid caregivers), saves preparation time, avoids distress, privacy by design, honest evidence framing. SC-3, SC-7, SC-10 |
| 4. Quality of idea | FR-7, 14, 17, 21, 22, 23; ADR 0003 | Reminiscence-bump window as a Qloo filter, closed Reaction loop feeding Qloo signals, side-by-side Baseline Kit proving the hard filter. SC-2, SC-4 |
| Hard filter (not the same without Qloo) | FR-11, 16, 17; SC-1, SC-2 | Validator makes it true by construction. The toggle makes it visible |
| Kit `SUBMISSION.md` cues | FR-16, 24; NFR-25, 11, 22 | Provenance, responsible data, reproducible setup, Qloo as in-flow evidence, limitations listed |

## 7. Open questions and risks

| # | Item | Impact | Mitigation or owner |
|---|---|---|---|
| R1 | **Qloo key not issued.** Critical path. Unknown rate limits. | Fixtures may diverge from live shapes. | Zod contracts from the docs, fixture adapter, request key today, run smoke test on arrival (A6). Owner: user |
| R2 | **Music Cues are artists, not songs.** Qloo has no track entities, and the glossary defines a Cue as "a song by an artist". | An LLM naming tracks would break FR-11. | Cue = artist entity; "play" link searches the artist (A12). Decide whether `CONTEXT.md` Cue wording needs updating |
| R3 | **Era weakness for artists.** No `release_year` filter for artists, and Qloo skews present-day. | Music may feel off-era. | Era-correct Seeds, `55_and_older`, Hometown signal; LLM re-ranks only within Qloo candidates; measure in SC-2 |
| R4 | **`55_and_older` is the finest age bucket**, so cohort precision is coarse. | Weak differentiation between a 1938 and 1958 birth year. | Reminiscence Window filters on film/TV/books carry the era; be honest in limitations |
| R5 | **Hometown resolution.** `signal.location.query` may not resolve small towns or non-US places. | Weak or empty music signal. | Fall back to nearest city or region; surface `needs_input` |
| R6 | **Distress risk from reminiscence.** Cochrane notes carer anxiety in joint sessions [2]. | Harm and credibility. | Avoid List, no-quiz Prompts, Skip and End controls, stop-on-distress tip, framing (FR-12, 18, 28) |
| R7 | **LLM data handling.** First name is stripped, but the Avoid List and Seeds still reach the model provider. | Responsible-data score. | Verify AI Gateway data-retention options; document in README; open question for user |
| R8 | **Browser storage is unencrypted and per-device.** Shared tablets in care homes. | Privacy and data-loss. | Privacy note, export reminder, delete control. Optional passphrase is deferred (A16) |
| R9 | **Cost and abuse on a public demo.** LLM spend from anonymous traffic. | Budget overrun during judging. | Per-IP and global caps, warm cache for the demo persona (A18) |
| R10 | **Scope versus 27 days.** | Late slices slip. | Slices 1-6 are the winning core. FR priority column marks cut order: C, then S |
| R11 | **Hallucination through Prompts or tips.** Prompts may name works that are not Cues. | Backdoor around FR-11. | Prompts may reference only Cues' names; post-validator checks for capitalised entities not in the Kit |
| Q1 | Does the Devpost submission require a demo video? Not in the plan. | Extra deliverable. | Confirm in the rules page; budget half a day (A22) |
| Q2 | Is "Visitor compare" worth building before polish? | Time. | Treated as C; revisit at milestone (b) |
| Q3 | Exact `signal.location.query` semantics for a city as signal versus filter. | Music quality. | Resolve in the first live smoke test |

## 8. References

1. Alzheimer's Association, 2025 Facts and Figures: https://www.alz.org/FACTS/ (peer-reviewed summary: https://pmc.ncbi.nlm.nih.gov/articles/PMC12040760/)
2. Woods et al., Cochrane Review "Reminiscence therapy for dementia" (updated 2018): https://cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001120.pub3 and plain-language summary https://www.cochrane.org/news/featured-review-reminiscence-therapy-dementia
3. Thomas et al., Brown University evaluation of Music & Memory in 196 nursing homes (American Journal of Geriatric Psychiatry): https://www.brown.edu/news/2017-05-10/music
4. Music for My Mind, "What is the Reminiscence Bump?" (secondary summary; a primary peer-reviewed source should be added by the doc-writer): https://musicformymind.com/?p=5447
