# 12: Agent tools: `expand_theme`, `rerank_cues` and `compose_kit`

Status: ready-for-agent
Blocked by: 11
Slice: 3a-ii Agent loop + evals (CORE), part 1 of 2 · Size: M · Spec: ../spec.md

## What to build

This ticket builds the agent's three bounded, read-only tools, plus the static prompt and the compacted registry they work over. It can be verified with direct tool calls against `FixtureQlooClient`, with no model:
- `expand_theme` deepens a fingerprint theme and streams new candidates.
- `rerank_cues` re-scores a shortlist.
- `compose_kit` accepts only a schema-valid `KitDraft`.
- Per-tool caps and the shared reserve are enforced.

## Acceptance criteria

- [ ] `createKitTools({client, pre, bound, emit, signal})` returns `{expand_theme, rerank_cues, compose_kit}`. Every tool is read-only, returns an envelope and never throws.
- [ ] **`expand_theme`** takes `{domain, tagIds ≤ 3, take 5..10, forSession? 1..4}` (EVALS (j)).
  - Every `tagId` must be in `pre.fingerprint`, else it returns `errorCode: 'unknown_id'` with no call.
  - The Window, location, age and Exclusions are bound by the server.
  - New entities pass the §14.1 name screen, join the registry, and stream as `data-candidates` with `source: 'expand_theme'`.
  - The agent trace line reads "Looking deeper into '<tag name>' for Session N", with the tag name from Qloo and an integer session number.
  - On error or budget it reads "Couldn't look deeper this time".
- [ ] **`rerank_cues`** takes `{domain, entityIds ≤ 20}`, and every ID must be in the registry. It uses `filter.results.entities`.
- [ ] **Per-tool caps (§14.4):** `expand_theme` ≤ 2 and `rerank_cues` ≤ 2, both within the shared agent reserve of 4. Going over a cap → `errorCode: 'tool_cap'`. A drained reserve → `'budget'`. Add `'tool_cap'` to the `ErrorCode` union.
- [ ] **`compose_kit`** validates its input against `KitDraft` and is terminal.
- [ ] **`compactRegistry(pre, bound)`** gives ≤ 15 Cues per domain, and previously shown Cues that aren't Learned Favorites get affinity × 0.5.
- [ ] **`SYSTEM_PROMPT`** is static, ≥ 1024 tokens (it counts toward the Gateway prompt cache), and contains the canary `ML-CANARY-7f3a`. `renderDigest` wraps the Life Story in a `<life_story>` data block and caps and strips free text to 200 characters (EVALS §4).
- [ ] **`LLM_PROVIDER_OPTIONS`** = `{gateway: {caching: 'auto', zeroDataRetention: true, disallowPromptTraining: true}}`.

## Files / modules (PLAN §3.3)

- `src/agent/tools.ts`, `src/agent/compactRegistry.ts`, `src/agent/systemPrompt.ts`, `src/agent/providerOptions.ts`, `src/agent/renderDigest.ts`
- `src/qloo/types.ts` (adds `tool_cap`)
- `src/agent/trace.ts` (agent labels)

## Tests to write first (TDD)

- `src/agent/tools.test.ts` (new):
  - a tag outside the fingerprint → `unknown_id`;
  - the third `expand_theme` → `tool_cap`;
  - reserve exhaustion → `budget`, tested in both orders (expand-first and rerank-first) (§14.4);
  - new entities appear in the registry and in `data-candidates`;
  - the trace label text;
  - rerank with an unknown ID is rejected;
  - `compose_kit` rejects an invalid draft.
- `src/agent/compactRegistry.test.ts` (new): the cap, and the repeat down-weighting.
- `src/agent/systemPrompt.test.ts` (new): token-count lower bound and canary present.
- Seams: 1 `QlooClient`, 6 `StreamEmitter`.

## Comments
