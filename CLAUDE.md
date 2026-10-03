# Memory Lane

Reminiscence-therapy agent for dementia caregivers, grounded in Qloo's taste graph. Built for the Qloo Agentic Hackathon (submission deadline 2026-10-30 23:45 ET).

## Non-negotiables

- **The LLM selects, Qloo supplies.** Every recommended item shown to a user must carry a Qloo `entity_id`. The LLM may choose, order, theme and explain Qloo candidates; it must never invent an entity. See `docs/adr/0003-llm-selects-qloo-supplies.md`.
- **Local-first personal data.** Life Stories and Session Logs live in the browser; server routes are stateless. See `docs/adr/0001-local-first-personal-data.md`.
- **Secrets server-side only.** `QLOO_API_KEY` and `AI_GATEWAY_API_KEY` live in `.env.local` / Vercel env. Never commit them, never expose them to the client.
- **Aggregate, not individual.** Copy describes Qloo results as what people who share someone's era and favorites tend to love, never as facts about the individual.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/` (no remote tracker yet). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
