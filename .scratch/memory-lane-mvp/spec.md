# Spec: Memory Lane MVP

Status: ready-for-agent
Feature slug: `memory-lane-mvp`
Sources: `PLAN.md` v3 (build source of truth; §14 addendum is binding), `REQUIREMENTS.md`, `EVALS.md`, `UX.md`, `CONTEXT.md`, ADR 0001-0003, `docs/qloo-api.md`, `ASSUMPTIONS.md`.
Precedence: PLAN.md wins on any conflict. Inside PLAN.md, §14 wins over earlier sections.
Tickets: `issues/` (index in `README.md`).

## Problem Statement

A Caregiver looking after a Person living with dementia wants to run reminiscence Sessions. Research suggests these bring small benefits. The blocker is preparation. Putting together Cues that fit this Person's era, place and taste by hand takes hours. So most Caregivers fall back on generic "1950s hits" lists. Those lists miss what the Person actually loved, and they can touch painful topics such as a war, a lost spouse or a hospital stay.

The Caregiver is usually tired and short of time, and is often working on a tablet beside the Person. They need:
- a week of Sessions that feel like this Person's youth;
- a reason behind every Cue that they can trust and explain to family;
- confidence that nothing on the Avoid List will come up;
- a Kit that gets better after every Session.

They will not create accounts or hand over personal data to a server. An LLM alone is not good enough: it stereotypes eras and invents works.

## Solution

Memory Lane is a hosted web app. From a short Life Story it builds a Kit of 3-4 themed Sessions in which every Cue is a real Qloo entity.

1. **Life Story.** The Caregiver enters a first name, birth year, Hometown and optional places. They pick 2-5 Seeds, each confirmed as a Qloo entity, add an Avoid List and choose a Dementia Stage. The app computes the Reminiscence Window (birth year + 10 to + 30) and shows it in plain words.
2. **Kit build.** The server asks Qloo for Cues across music, film, TV, books, places and brands, bound to the Window, the `55_and_older` age signal, the Hometown and every Exclusion. It also asks for a taste fingerprint. A Claude agent can then look deeper into up to 2 fingerprint themes and re-rank up to 2 shortlists, before arranging Cues into Sessions with Prompts, sensory activities and Caregiver tips. A validator drops anything Qloo did not supply, anything excluded or out of era, and any unsafe text. A live trace shows which work Qloo did, which the agent did and which the validator did.
3. **Why this?** Every Cue shows its Provenance: affinity score, Seed contributions and signals, written as what people of the same era and taste tend to love.
4. **Session Mode.** A calm, high-contrast, tablet-first player shows one Cue per screen. Skip, End and Pause are always visible, and Reactions (Engaged, Neutral, Distressed) can be logged live. It works offline.
5. **Learning.** **End & build next Kit** turns Engaged Cues into Learned Favorites and Distressed Cues into Exclusions (with undo). The next Kit is built from the updated Taste Profile, with a visible "Learned from last session" diff.
6. **Without Qloo.** A comparison view puts a Baseline Kit, written by the model alone, beside the Qloo Kit. It flags Baseline entries that Qloo can't find, that fall outside the Window, or that hit the Avoid List.
7. **Privacy.** All personal data stays in the browser, with export, import and delete all. The first name never leaves the device.

**Judge demo.** One click on **Meet Margaret** replays a recorded run in under 3 s. The improved Kit arrives at click 6, and click 7 shows the comparison.

Signed-off deviations from REQUIREMENTS (user, 2026-10-03, check-in (a)):
- **FR-9 (partial).** The server prefetches the baseline candidates with no model. The agent's own Qloo calls are limited to `expand_theme` (≤ 2) and `rerank_cues` (≤ 2).
- **FR-12.** A failing Prompt or other model string is replaced by a vetted template, not regenerated.
- **SC-5.** The golden path is ≤ 7 clicks, met at click 6.

## User Stories

### First contact and the judge demo
1. As a hackathon judge, I want one button on the landing page that opens a ready-made Person, so that I can see the product without typing or signing up.
2. As a hackathon judge, I want Margaret's Kit to appear in under 3 seconds, so that my first impression is not a loading spinner.
3. As a hackathon judge, I want the replay labelled "Replay of a real run recorded <date> · Build it live", so that I know what I'm seeing and can trigger a real run.
4. As a hackathon judge, I want **Build it live** to run the real path at real pace, so that I can check the replay isn't faked.
5. As a hackathon judge, I want to reach an improved second Kit by click 6 with no typing, so that the learning loop fits in a short review.
6. As a hackathon judge, I want click 7 to show the Kit "Without Qloo", so that I can see why Qloo is load-bearing.
7. As a hackathon judge, I want the demo to work even when Qloo or the AI is unreachable, so that an outage during judging doesn't break the story.
8. As a hackathon judge, I want a "fixture run" label before live Qloo data exists, so that I am never misled about the data source.
9. As a new Caregiver, I want a clear **Start a Life Story** link beside the demo, so that I can try it for my own Person straight away.
10. As a developer, I want a clean clone to run in fixture mode with no keys in under 10 minutes, so that judges and contributors can reproduce the demo.

### Life Story intake
11. As a Caregiver, I want a 6-step wizard with one idea per screen, so that setup feels manageable when I'm tired.
12. As a Caregiver, I want my answers saved on this device after every step, so that I can stop and resume later without losing anything.
13. As a Caregiver, I want to enter only the Person's first name, so that I'm not asked for more personal data than needed.
14. As a Caregiver, I want gentle warnings when I type something that looks like a surname, address or diagnosis, so that I don't overshare by accident.
15. As a Caregiver, I want to see the Reminiscence Window ("1956 to 1976") as soon as I enter the birth year, so that I understand which years the Kit will draw on.
16. As a Caregiver, I want to give the Hometown, an optional Young-Adult City and an optional Care Location, so that music and local places reflect where the Person actually lived.
17. As a Caregiver, I want to add optional heritage, language and occupation, so that the Kit can reflect the Person's roots.
18. As a Caregiver, I want to be told that the Person's name is replaced with a placeholder before anything leaves the device, so that I trust the app with their story.
19. As a Caregiver, I want each Seed I type to be matched to a real Qloo entity with an image, so that I know the app understood which favorite I meant.
20. As a Caregiver, I want to choose between candidates when a Seed is ambiguous ("Which Doris Day did you mean?"), so that the app never guesses wrong on my behalf.
21. As a Caregiver, I want a "None of these" option and a clear "Check the spelling" message, so that a bad match never sneaks into the Life Story.
22. As a Caregiver, I want a calm "We can't reach Qloo right now. Your answers are saved." message with Retry, so that an outage doesn't cost me my work.
23. As a Caregiver, I want to add works or people to the Avoid List and have them resolved like Seeds, so that they are excluded precisely.
24. As a Caregiver, I want to add free-text Avoid topics such as "hospitals" and see whether they matched a Qloo tag or will be kept out of Prompts, so that I know how each one is enforced.
25. As a Caregiver of a veteran, I want an off-by-default switch to include themes like war, loss or hospitals, so that I can allow them when I know the Person enjoys them.
26. As a Caregiver, I want to pick Early, Middle or Late Dementia Stage with a "Not sure? Choose Middle." hint, so that Sessions are formatted for the Person's abilities.
27. As a Caregiver, I want a review step with Edit links before building, so that I can fix mistakes without starting over.
28. As a music therapist, I want birth years from 1920 to 1975 accepted, so that I can serve the full age range I work with.

### Building the Kit
29. As a Caregiver, I want a Kit of 3-4 themed Sessions of 20-45 minutes each, so that I have a week of activities ready.
30. As a Caregiver, I want each Session to mix music, film, TV, books, places or dishes, and brands, so that conversations have many ways in.
31. As a Caregiver, I want every Cue to be a real Qloo entity, so that I'm never handed an invented song, film or place.
32. As a Caregiver, I want film, TV and book Cues to fall inside the Reminiscence Window, so that they come from the Person's most vivid years.
33. As a Caregiver, I want no Cue repeated across Sessions, so that every Session feels fresh.
34. As a Caregiver, I want Session titles and themes that feel human ("Saturday Night at the Pictures, 1962"), so that the Kit reads like something made for this Person.
35. As a Caregiver, I want to see what the Person's taste is made of (the taste fingerprint), so that I understand the threads the Kit follows.
36. As a Caregiver, I want to watch the Kit being built in a "Behind the scenes" trace, so that I can see Qloo is being asked with real signals.
37. As a Caregiver, I want the trace to tell apart the server asking Qloo, Claude arranging, and the validator checking, so that I know who made each decision.
38. As a Caregiver, I want to see when Claude is "Looking deeper into 'country & western' for Session 2", so that I understand why some themes are richer.
39. As a Caregiver, I want counters for Qloo calls, cache hits, Cues found, Cues chosen and "Not from Qloo 0", so that the grounding claim is visible.
40. As a Caregiver, I want candidate photos to fall onto a pile and sort into Session pages, so that the build feels tangible.
41. As a Caregiver, I want a **Stop building** control at all times, so that I'm never stuck waiting.
42. As a Caregiver using a screen reader, I want only phase changes and results announced (at most every 4 seconds), so that the trace doesn't flood me.
43. As a Caregiver, I want the first trace line within 2 seconds, so that I know something is happening.
44. As a Caregiver, I want a live Kit in under 45 seconds most of the time, so that building fits into a short break.
45. As a Caregiver, I want a "Simple Kit" with Cues still from Qloo when the AI is unavailable, so that I still get a usable Kit.
46. As a Caregiver, I want a badge and a gap card when one domain fails ("Books unavailable, Kit built without them"), so that I know the Kit is partial rather than broken.
47. As a Caregiver, I want my last saved Kit with a "Cached result" badge when Qloo is mostly down, so that I can still run a Session.
48. As a first-time Caregiver, I want "We couldn't build the Kit this time. Nothing was lost. [Try again] [Meet Margaret]" when everything fails, so that I have a next step.
49. As a Caregiver, I want "No books turned up for 1956 to 1976. [Widen by 3 years] [Add a Seed]" when a domain is empty, so that I can decide whether to widen.
50. As a Caregiver, I want Cues found by widening stamped "Just outside 1956-1976", so that era claims stay honest.
51. As a Caregiver, I want widening one domain to leave the other Sessions unchanged, so that I don't lose Cues I already liked.
52. As a Caregiver, I want the validator summary ("Checked: 21 of 21 from Qloo. Replaced 2 Prompts."), so that I can see the safety net worked.

### Trust and Provenance
53. As a Caregiver, I want "Why this?" on every Cue, so that I can understand and defend each choice.
54. As an activity coordinator, I want the affinity score shown as a gauge with words, so that families understand it without numbers.
55. As a Caregiver, I want to see which Seeds contributed to a Cue and by how much, so that I can see the link to the Person's favorites.
56. As a Caregiver, I want to see which signals applied (Age 55+, Hometown, Window, theme), so that I know what else shaped a Cue.
57. As a Caregiver, I want "signals only" shown when a Cue had no Seed contribution, so that Provenance never overclaims.
58. As a Caregiver, I want Provenance phrased as what people of the same era and taste tend to love, so that it never claims facts about the Person.
59. As a Caregiver, I want a "fixture data" note while scores are illustrative, so that I'm not misled before live data.

### Session Mode
60. As a Caregiver, I want to open a Session in a calm, full-screen player with one Cue per screen, so that the Person isn't overwhelmed.
61. As a Caregiver, I want large type (24 px or more) and very high contrast, so that the Person and I can read it from across a table.
62. As a Caregiver, I want Back, Skip, Reactions, Next and End in a bottom bar on every layout, so that I can always move on or stop.
63. As a Caregiver, I want touch targets of at least 48 px, so that I can tap reliably while talking.
64. As a Caregiver, I want open, failure-free Prompts ("Tell me about the dances you went to"), never quiz questions, so that the Person never feels tested.
65. As a Caregiver of someone in the late stage, I want image-first screens, very short Prompts and at least 2 sensory activities, so that the Session needs little speech.
66. As a Caregiver, I want each sensory activity on its own screen, so that I can pace it.
67. As a Caregiver, I want a "Play on…" link for music Cues that opens an external search, so that I can play the artist without the app hosting audio.
68. As a Caregiver, I want a "For you" disclosure with tips, a Provenance line and the safety note, so that guidance is there without cluttering the Person's view.
69. As a Caregiver, I want Pause to show something calming, so that I can settle the Person if a moment goes badly.
70. As a Caregiver, I want Session Mode to keep working offline from the saved Kit, so that a weak care-home Wi-Fi doesn't stop a Session.
71. As a keyboard user, I want a sensible tab order and optional shortcuts inside the player only, so that I can run a Session without a mouse.
72. As a Caregiver, I want nothing to auto-advance, so that the Person sets the pace.

### Reactions and learning
73. As a Caregiver, I want to tap Engaged, Neutral or Distressed for a Cue during the Session, so that logging takes no extra effort.
74. As a Caregiver, I want Reactions to be optional, so that I never feel forced to rate a moment.
75. As a Caregiver, I want the End button to read **End & build next Kit** once I've logged a Reaction, so that improving the Kit is one tap.
76. As a Caregiver, I want **End Session** with a confirm when I logged nothing, so that I don't end by accident.
77. As a Caregiver, I want a wrap-up screen ("How did it go?") where I can log or change Reactions afterwards, so that I can record them once the Session is over.
78. As a Caregiver, I want Engaged Cues to become Learned Favorites in the Taste Profile, so that the next Kit builds on what worked.
79. As a Caregiver, I want a Distressed Cue and its top themes added as Exclusions, so that they don't come back.
80. As a Caregiver, I want a calm banner after a Distressed Reaction ("That's okay. Let's pause.") with Switch, Skip, End and Undo, so that I can respond kindly and fix a mistaken tap.
81. As a Caregiver, I want a "Learned from last session" diff (Learned Favorites added, Cues removed, Exclusions added), so that I can see how the Kit changed.
82. As a Caregiver, I want Cues that cite "Because Margaret was Engaged by Patsy Cline on 3 Oct", so that I can see the learning in each Cue.
83. As a Caregiver, I want at least 30% of the next Kit's Cues to be new, so that repeat Sessions don't get stale.
84. As a hackathon judge, I want a recorded Kit 2 that is re-checked against current Exclusions when live building fails, with "recorded example" on claims not backed by today's Reactions, so that the replay never overclaims.

### Safety
85. As a Caregiver, I want every Avoid List entity and tag applied to every Qloo call, so that excluded items cannot appear at all.
86. As a Caregiver, I want Avoid topics such as a song title kept out of all generated text, so that a painful song is never mentioned in a Prompt.
87. As a Caregiver, I want themes like war, loss and hospitals excluded by default, so that I'm protected even when I didn't think to list them.
88. As a Caregiver, I want Prompts that never assume a living spouse or parent, so that a Prompt doesn't reopen grief.
89. As a Caregiver, I want no therapy or cure claims anywhere, so that the app stays honest about what reminiscence can do.
90. As a Caregiver, I want a not-medical-advice line on every screen and in tips, so that I remember to involve the care team.
91. As a Caregiver, I want names of shows or works that hit my Avoid topics (for example "General Hospital" for "hospitals") dropped before they are even shown as candidates, so that they never appear on screen.
92. As a Caregiver, I want text I type in the Life Story to be unable to change the app's rules, so that a stray instruction can't add Cues or remove Exclusions.

### Without Qloo comparison
93. As a hackathon judge, I want a side-by-side of the Qloo Kit and a Baseline Kit written by the model alone, so that I can judge Qloo's contribution.
94. As a hackathon judge, I want Baseline entries flagged "Not found in Qloo", "Outside 1956-1976" or "On Avoid List", so that the differences are concrete.
95. As a hackathon judge, I want era match and overlap shown as paired bars with labels, so that I can read the result at a glance.
96. As a Caregiver, I want the Baseline clearly stamped "Comparison only. This Kit can't be run.", so that I never run an ungrounded Session.
97. As a hackathon judge, I want the demo Baseline shown recorded-first with a "Run it live" option, so that the comparison is instant but verifiable.

### Data, privacy and multiple Life Stories
98. As a Caregiver, I want all Life Stories, Taste Profiles and Session Logs stored only in this browser, so that no health-related data sits on a server.
99. As a Caregiver, I want to export everything as one versioned file, so that I can back it up or move devices.
100. As a Caregiver, I want to import that file with a confirmation and a size limit, so that I can restore safely.
101. As a Caregiver, I want **Delete all data** with a clear confirmation, so that I can wipe a shared tablet.
102. As a Caregiver, I want a banner with Export when stored data is corrupt or from a newer version, so that I never silently lose data.
103. As a Caregiver opening a story link on another device, I want "This Life Story lives on another device. Import it from a file.", so that I understand why it's missing.
104. As an activity coordinator, I want up to 10 Life Stories with a switcher, so that I can prepare for several Persons.
105. As an activity coordinator, I want to delete a single Life Story, so that I can remove someone who has left.
106. As an activity coordinator, I want a clean printable Kit (Sessions, Cues, Prompts, tips, Avoid summary, safety line), so that staff without the app can run Sessions.

### Shared listening (stretch)
107. As a Visitor, I want to enter 2-5 of my own favorites and see "Cues you'll both enjoy" with the overlap explained, so that I can join a Session with shared ground.
108. As a Visitor, I want my favorites not stored by default, so that joining doesn't add my data to the device.

### Operator, security and quality
109. As the operator, I want per-IP rate limits, a daily cap on live AI runs and prepaid credits, so that anonymous traffic can't run up a large bill.
110. As the operator, I want replays exempt from the AI cap and limited separately, so that judges can always see the demo.
111. As the operator, I want a 429 with `Retry-After` and a countdown message when a limit is hit, so that visitors know when to retry.
112. As the operator, I want rate limiting impossible to switch off in a Vercel deployment, so that a test setting can't leak into production.
113. As the operator, I want API keys only in server env and a CI scan of the git history and client bundle, so that no secret ever ships.
114. As the operator, I want every AI call to request zero data retention and no training, so that Person data isn't kept by providers.
115. As the operator, I want per-request logs with counts, IDs, timings and hashed IPs only, so that I can debug without holding personal data.
116. As the operator, I want a strict CSP with nonces and allow-listed image hosts, so that injected scripts and unknown images are blocked.
117. As a developer, I want every route to validate input strictly and return generic 400s, so that malformed or hostile payloads fail safely.
118. As a developer, I want the Qloo client to retry 429/5xx with jittered backoff and fall back to stale cache, so that brief Qloo hiccups don't reach users.
119. As a developer, I want a fixture Qloo client that behaves like Qloo for any Taste Profile, so that the whole product works before the key arrives.
120. As a developer, I want a contract smoke test that fails when Qloo silently ignores a parameter, so that live data matches our assumptions.
121. As a developer, I want offline evals in CI with a scripted model and fixture Qloo, so that grounding, safety and loop rules are checked on every PR.
122. As a developer, I want a live eval with a cross-family judge, so that Prompt quality and Baseline differences are measured with real models.
123. As a developer, I want ≥ 80% coverage on `domain` and `qloo` and ≥ 90% on the validator, so that the core logic is trustworthy.
124. As a developer, I want visual, accessibility and Lighthouse checks across 320-1920 px, so that the design holds on every device.

## Implementation Decisions

### Architecture (PLAN §1)
- Next.js 16 App Router, TypeScript strict, Node runtime, deployed on Vercel Hobby with Fluid Compute. Route handlers are thin shells over handler factories `(req, deps) => Response`, so every route is testable without a server.
- **Trust boundaries.** Browser → server is untrusted: Zod-validated, size-capped and rate-limited, and the server recomputes the Reminiscence Window from `birthYear`. Server → Qloo carries only IDs, city strings and capped, scrubbed text. Server → AI Gateway carries only the scrubbed LifeStoryDigest and compact Cue records. Model output is untrusted until it has been validated and hydrated.
- **Local-first (ADR 0001).** No accounts, no server database, no cookies. All personal data lives in IndexedDB.
- **Direct Qloo HTTP (ADR 0002)** behind one `QlooClient` seam, with Http and Fixture implementations selected by `QLOO_MODE`.
- **The LLM selects, Qloo supplies (ADR 0003).** The model outputs entity IDs and fingerprint tag IDs only. Names, images and years are hydrated from the run registry.

### Modules (deep modules, small interfaces; PLAN §3)
- **`domain`** (pure, injected time, immutable, shared by client and server):
  - Window: `reminiscenceWindow`, `effectiveWindow`, `AGE_BUCKET`.
  - Privacy: `toDigest`, `scrubQuery`, `detectPiiRisk`.
  - Taste Profile: `profileFromStory`, `toSignals`, `applyReactions`, `revertReaction`, `diffKits`.
  - Session rules and checks: `SESSION_FORMATS`, `checkText`, `validateKit`.
  - Comparison: `compareKits`, `nameSimilarity`.
- **`qloo`** (server-only):
  - `createQlooClient`, `createCallBudget`, `buildInsightsParams`, `cacheKey`, `backoffDelay`, `createTieredCache`, `normalizeEntity`, `resolveSeed`, `resolveTag`.
  - Envelope statuses: `ok | empty | needs_input | partial | degraded | error`. Error codes include `budget`, `unknown_id` and, per §14, `tool_cap`.
- **`agent`** (server-only):
  - Fetch and tools: `prefetch`, `createKitTools`, `compactRegistry`.
  - Prompt and model: `SYSTEM_PROMPT` (≥ 1024 tokens, canary `ML-CANARY-7f3a`), `LLM_PROVIDER_OPTIONS`, `getModel`.
  - Composition: `composeKit`, `composeDeterministic`, `composeBaseline`, `hydrateKit`, `replayRecorded`.
  - Typed trace-label builders, and vetted `templates` keyed by domain × stage.
- **`server`**: `getServerConfig`, `createRateLimiter`, `clientKey`, `consumeDailyLlmRun`, `parseJson`, `logEvent`, plus a CSP nonce proxy.
- **`contracts`**: Zod 4 schemas per PLAN §4.1. These are the single source of truth for client and server.
- **`lib/store`**: `Repository` over a `KeyValueStorage`, with a versioned `StoreV1`, migrations, quarantine, import/export and `useStore`.
- **`features/*`**: intake, kit, trace, provenance, session-mode, compare and the Your data area.

### Kit run (`POST /api/kit`)
1. **Open.** Validate, rate-limit and open a UI message stream. The first `data-trace` arrives within 2 s.
2. **Prefetch (no model, 16-call budget).** P1: music, film, TV and book in parallel. P2: place, brand and fingerprint. P3: a relaxation ladder for empty domains only (drop tags, then top-2 Seeds). The ladder **never widens the Window** and never relaxes Exclusions. P4: an agent reserve of 4 calls that prefetch cannot use. Concurrency is capped at 6.
3. **Name screening at registry ingest (§14.1).** Entity names that hit an Avoid topic or the sensitive lexicon are dropped before they stream as candidates or reach compose.
4. **Upstream failure.** If ≥ 2 domains error, emit `upstream_error`; the client shows its last saved Kit or the first-run error. The demo replays its recording instead.
5. **Compose.** With a model and budget available, a `ToolLoopAgent` (`anthropic/claude-sonnet-5.5`, temp 0.3, 6k output tokens) gets the compacted registry and three read-only tools:
   - `expand_theme`: ≤ 2 calls, tag IDs must come from the fingerprint.
   - `rerank_cues`: ≤ 2 calls, IDs must be in the registry.
   - `compose_kit`: terminal.

   Loop control:
   - Stop on `composeAccepted`, `composeFailedTwice` or `isStepCount(5)`.
   - `prepareStep` forces `compose_kit` from zero-based `stepNumber ≥ 2`.
   - Abort after 90 s or on client disconnect.

   Any failure falls back to `composeDeterministic` over the same prefetch.
6. **Finish.** `validateKit` → `hydrateKit` → exactly one `data-kit`. The client saves the Kit.

### Stream protocol (PLAN §4.2)
- `UIMessage` data parts, all non-transient: `data-notice`, `data-trace` (stable IDs; `actor` is server, agent or validator), `data-candidates` (`source` is prefetch or expand_theme), and exactly one `data-kit`. A failure ends with an error notice and no Kit.
- The client reads the stream with `fetch` + `readUIMessageStream`. `consumeKitStream` folds the parts into `{traces, candidates, kit, notices, status}`. `useChat` is not used.

### Validator (fixed order, idempotent; PLAN §3.2 + §14.1)
1. Grounding.
2. Exclusions.
3. Name screening (step 2b, the §14.1 backstop).
4. Window: drop film/TV/book Cues with no year or outside the effective Window. Keep those outside the original Window but inside the effective one, flagged `outsideWindow`.
5. Duplicates.
6. Text: `checkText` by scope; a failing string is replaced from templates.
7. Stage fit: format, Prompt caps, sensory top-up, duration clamp.
8. Novelty: ≥ 30% new versus `previousCueIds`.
9. Backfill to the stage minimum.

Because `domain` is pure and `agent` is server-only, the templates are passed in through the validation context rather than imported by `domain`. This resolves a layering tension in PLAN §3.2 without changing behaviour.

### `checkText` scopes (R4, §14.6)
- **Body** (Prompts, tips, sensory activities, "Why this?"): quiz regex, claim lexicon, Avoid terms (including song titles), sensitive lexicon (unless opted in), quoted strings that match no registry name, and invented Title-Case runs not on the allow-list.
- **Heading** (title, theme): quoted strings, Avoid terms, the sensitive lexicon and the claim lexicon only. The Title-Case rule never applies.
- **Allow-list:** registry, Seed, Learned Favorite and fingerprint tag names; Hometown, Young-Adult City and Care Location; days, months and holidays; sentence-initial words.

### `SESSION_FORMATS` (FR-6)

| Stage | Format | Cues | Prompts per Cue | Words per Prompt | Sensory activities |
|---|---|---|---|---|---|
| Early | conversation | 4-6 | ≤ 3 | ≤ 25 | ≥ 1 |
| Middle | mixed | 4-6 | ≤ 2 | ≤ 18 | ≥ 1 |
| Late | sensory | 3-5 | ≤ 1 | ≤ 12 | ≥ 2 |

### Reactions
- **Engaged** → Learned Favorite, or +1 weight up to 3.
- **Distressed** → the entity plus its top-2 tags become Exclusions, and any matching Learned Favorite is removed. Distressed beats Engaged.
- **Neutral** → no change.
- Exclusions only grow, except through undo.

### Widen (R2, §14.2)
- The only widen mechanism is the Caregiver's "Widen by 3 years" CTA, once per film/TV/book domain.
- It re-runs at the same `generation` with `previousCueIds: []`, using the `kitLive` bucket.
- Only the widened domain's Cues are recomposed (deterministically); all other Sessions stay unchanged.
- Era fit is always measured against the original Window.

### Demo replay (PLAN §1, §14.5)
- `/p/demo-margaret/kit` seeds the demo story.
- Replay streams the recorded trace and candidates compressed to ≤ 2.5 s, re-validates the recorded draft against the current Exclusions, and emits `source: 'recorded'`.
- Recorded Kit 2 is served only on an upstream failure at generation 2. An LLM failure goes to `composeDeterministic`; generation ≥ 3 uses `composeDeterministic` over the recorded registry.
- Learned flags are claimed only for current Learned Favorites. Every other carried-over claim reads "recorded example".
- Replay with a non-demo `storyId` returns 400 on both kit and baseline routes.

### API contracts (PLAN §3.4)

| Route | Body | Rate-limit bucket (per IP) |
|---|---|---|
| `POST /api/resolve` | `{kind, query≤80, domain?}` | `resolve` 60 / 1 min |
| `POST /api/kit` | `KitRequest` ≤ 16 KB | `kitLive` 6 / 10 min + daily cap 150; replay uses `kitReplay` 30 / 10 min, exempt from the cap |
| `POST /api/baseline` | `BaselineRequest` | `baselineLive` / `baselineReplay` |
| `POST /api/compare` | — | `compare` 10 / 10 min; ≤ 24 `/search` calls, concurrency 4 |
| `POST /api/visitor-compare` (stretch) | — | `compare` |

- A full bucket returns 429 with `Retry-After`. A reached daily cap returns a deterministic or recorded Kit plus `notice: cap_reached`.
- `RATE_LIMIT_MODE=off`, `ALLOW_MOCK_LLM` and `QLOO_FIXTURE_FAULTS` are honoured only when `VERCEL_ENV` is unset. `getServerConfig` throws if `RATE_LIMIT_MODE=off` is set while `VERCEL_ENV` is set.

### Schema (PLAN §4.1, summarised)
- `LifeStory`: first name only (≤ 30 letters), birth year 1920-1975, places, 2-5 `Seed`s, ≤ 10 `AvoidItem`s (entity, tag or topic), Dementia Stage, `sensitiveThemesOptIn`.
- `LifeStoryDigest` omits id, first name, Seeds and Avoid List objects, and carries `seedNames` and `avoidTopics` instead.
- `TasteProfile`: Seed IDs, ≤ 20 Learned Favorites (weight 1-3), ≤ 100 Exclusions (source avoid or reaction).
- `KitDraft` (model output, IDs only) versus `Kit`, which is hydrated with `Cue`s carrying `Provenance`, plus `notices`, `qloo` counters, `omittedDomains` and the original `window`.
- `StoreV1` holds ≤ 10 Life Stories, one draft, profiles, ≤ 6 Kits per story, ≤ 50 Session Logs per story, and the active story.
- `ExportFile` wraps `StoreV1`.
- Generated text uses the placeholder `{name}`, filled in client-side at render time only.

### Qloo integration (PLAN §5)
- Per-domain params follow PLAN §5.1. Every call carries Exclusions (plus `SENSITIVE_TAG_IDS` unless opted in), explainability and `take=15` (places: 10).
- Cache key: `sha256(endpoint + canonical params)`, which never contains a name.
- Layers: LRU(500) in front of Runtime Cache. Freshness is 24 h for insights and 7 d for search and tags; stale entries are served on error for up to 7 d, marked `degraded`.
- Retries: full jitter `min(2000, 250·2^n)·rand`, `Retry-After` honoured up to 2 s, 8 s timeout per attempt, 3 retries.
- The fixture client models Qloo semantics (R3 + §14.3):
  - It matches on endpoint, type, Window and location, and ignores interests and excludes.
  - It applies excludes itself.
  - `expand_theme` lookups filter by tag and return `empty` when nothing matches (§14.3 overrides §3.1).
  - Explainability is deterministic and labelled synthetic.
  - An unknown `/search` returns `empty` with a hint.
- **[QLOO-GATED] items, closed in slice K:** whether books honour `release_year` (else "era reported, not gated"), `tv_show` year coverage, per-entity weights, `SENSITIVE_TAG_IDS`, `QLOO_IMAGE_HOSTS`, and the real quota.

### Security and privacy (PLAN §7)
- Env is server-only and Zod-validated, with no `NEXT_PUBLIC_` variables.
- Every LLM call (Kit, Baseline, judge) passes `LLM_PROVIDER_OPTIONS` (`caching: 'auto'`, `zeroDataRetention`, `disallowPromptTraining`).
- CSP with a per-request nonce, HSTS, `nosniff`, `Referrer-Policy` and a restrictive `Permissions-Policy`. `dangerouslySetInnerHTML` is banned by lint.
- Prompt injection: the Life Story sits in a `<life_story>` data block, tools are read-only with server-bound filters, the model outputs only IDs, `checkText` runs on every model string, and a canary detects system-prompt leaks.
- gitleaks scans the history; a canary-key bundle scan checks the client build; browser source maps are off.

### UX (UX.md)
- **Visual direction:** "The Family Album". Browsing surfaces are tactile; Session Mode is flat with AAA contrast.
- **Fonts:** Fraunces + Atkinson Hyperlegible Next, self-hosted.
- **Tokens and copy:** design tokens as in UX §7; copy rules as in UX §8. Glossary terms are used exactly.
- **Session Mode direction:** chosen at check-in (b) from prototype variants a, b and c.

## Testing Decisions

**What makes a good test here.**
- Test external behaviour through the highest available seam: a handler factory's `Response`, a module's public function, or a rendered page. Do not test private helpers or call order.
- Tests are deterministic. Time, randomness, sleep, `fetch` and storage are injected.
- Prefer one seam per concern over mocking many internals. MSW is deliberately not used; injected `fetch` is the single network seam.
- Write the failing test first (TDD), as every ticket specifies.

**Test seams.** These are confirmed in PLAN §3.7, and the user's seam check is satisfied by that list.
1. `QlooClient` (Http and Fixture implementations)
2. Injected `fetch`
3. `sleep` / `random`
4. `KvCache`
5. `LanguageModel`: `MockLanguageModelV4` (from `ai/test`), scripted, plus a recording spy
6. `StreamEmitter`
7. `KeyValueStorage` (with `fake-indexeddb`)
8. Handler factories `(req, deps) => Response`
9. `getServerConfig(env)`
10. Clock
11. `consumeKitStream(body, onSnapshot)` over a real `Response`

**Test layers** (PLAN §8.1, with traceability in §10.1):

| Layer | What it covers | Gate |
|---|---|---|
| Domain unit | Window and `effectiveWindow`; Reactions and undo; `diffKits`; `checkText` on 70 labelled strings (UX titles pass as headings; a quoted Cue name is OK in body); `validateKit` steps 1-8 plus 2b and idempotence; the `toDigest` scrub (P6); all templates pass `checkText` | ≥ 80% `domain/**`; ≥ 90% `validator.ts` |
| Qloo | Param snapshot per domain (PLAN §5.1 is the spec); retry, `Retry-After`, 403, stale, schema, `budget` with no fetch, agent reserve, abort, image scrub; fixture-client semantics | ≥ 80% `qloo/**` |
| Agent offline eval | `pnpm eval:offline` in CI: EVALS §3 (b)-(k) on P1-P6, `unknown_id`, `budget`, `tool_cap` (both orders), forced compose, two compose errors → deterministic, arbitrary-Reactions property test (50 seeds) | Text replacement rate < 15% on scripted realistic drafts |
| Routes and stream | 400/413 on every route; replay with a non-demo story → 400; 429 + `Retry-After`; replay bucket skips the cap; part order; first-run error; demo generation-2 replay with R6 flags; privacy spy (no first name in any outbound Qloo URL or body, or in any model prompt); config refusal | — |
| Store | Migrations, quarantine, draft resume, 512 KB import cap, export → delete → import round-trip | — |
| E2E | Playwright on `next build && next start` in fixture + mock mode. Projects: phone chromium 375, tablet chromium 768, iPad webkit, desktop firefox 1440, plus a `limits` project. Covers the golden path, Widen, first-run error, keyboard, reduced motion | CI |
| A11y and visual | axe (0 serious or critical); screenshots at 320/768/1024/1440; no overflow from 320 to 1920; Session Mode contrast ≥ 7:1 | CI |
| Perf | `@lhci/cli` mobile against NFR-5/6 | Slice 8b |
| Live eval | `pnpm eval:live` (about $3): EVALS §3 metrics, judge `openai/gpt-5.6-sol`, temperature probe, calibration | Each check-in |
| Contract | `pnpm qloo:smoke` over 7 types | Slice K and submission |

**Prior art.** None yet: only the Next.js 16 scaffold exists. The first tests written in each module (see tickets 01, 02 and 05) set the patterns the rest follow. Test files named in PLAN §10.1 are used verbatim. New test files are colocated with their module.

## Out of Scope

- **No accounts, server database or multi-user sync** (non-goals and ADR 0001). No family sharing or multi-Caregiver collaboration.
- **No medical scope:** no advice, diagnosis, treatment or outcome claims, and no symptom or medication features.
- **No music hosting:** no audio hosting, embedded playback or streaming integration. No track-level Cues; music Cues are Qloo artists (A12).
- **No other platforms or languages:** no native apps, no speech recognition or voice/video, and no i18n beyond an English UI.
- **No training** on Person data, and no claims that Qloo results describe the individual.
- **Model-driven baseline fetching** (the full FR-9 wording) is replaced by server prefetch plus bounded agent expansion (signed-off deviation).
- **LLM regeneration of failing Prompts** (the FR-12 wording) is replaced by template replacement (signed-off deviation).
- **No automatic Window widening** by the ladder. The Caregiver CTA is the only widen mechanism.
- **Not before submission:** encryption or passphrase protection of local storage (A16), and integrations with care-home records.
- **Shared listening (FR-23, slice 8c)** is a stretch goal and is cut first if time runs short.

## Further Notes

- **Deadline.** Submission is due 2026-10-30 23:45 ET. CORE slices (1, 2a, 2b-i, 2b-ii, 3a-i, 3a-ii, 3b, 4, 5, 5b, 6, K, 9) are planned to finish Oct 19. If time runs short, cut in this order: 8c → 8b depth → the slice 7 judge.
- **Qloo key.** The key has not been issued. Everything builds against `FixtureQlooClient` until slice K, which is `ready-for-human` until the key exists. Escalation: on Oct 12 the user re-asks; on Oct 24 the team ships in labelled fixture mode and lists it under Known Limitations.
- **Human gates inside agent tickets:**
  - The first GitHub push and creating the public repo (A27).
  - `vercel --prod`.
  - Check-in (b): pick the Session Mode variant and review templates.
  - Reviewing the judge calibration labels.
  - Recording the Devpost video.
- **Glossary.** Terms are used exactly as in `CONTEXT.md`. REQUIREMENTS R2 noted an older Cue wording ("a song by an artist"). `CONTEXT.md` now says music Cues are artists, so no ADR or glossary conflict remains.
- **Doc drift fixed by §14.6:** headings also get the claim lexicon, and "quoted strings" means quoted strings that match no registry name.
