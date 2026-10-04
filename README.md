# Memory Lane

**Reminiscence Sessions for people living with dementia, built from what people of their era, hometown and taste actually loved.**

Memory Lane is an agent for family Caregivers and memory-care activity staff. Give it a birth year, a hometown and a few remembered favorites. It builds a week of themed reminiscence Sessions: music, films, TV, books, dishes and brands, each with open, failure-free conversation Prompts. Every Cue comes from [Qloo](https://qloo.com)'s cultural taste graph; the LLM only selects, sequences and explains. After each Session the Caregiver logs how the Person responded, and next week's Kit learns from it.

> Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com). Work in progress: the full README, live demo link and architecture notes are coming.

## Why Qloo

An LLM on its own tends to answer "1960s Memphis" with stereotypes. Memory Lane asks Qloo's taste graph three questions together: what people of this **age cohort**, from this **hometown**, who loved these **specific favorites**, also loved within the Person's **Reminiscence Window** (ages 10–30). Every Cue carries a Qloo `entity_id` and its Provenance, and the app shows the difference side by side with an LLM-only "Without Qloo" Kit.

## Status

| | |
|---|---|
| Slice 1: walking skeleton, CI, security headers | ✅ |
| Life Story intake, multi-domain Kits, agent composer, Session Mode, Reaction loop | 🔨 in progress |

See [`PLAN.md`](PLAN.md) for the architecture and [`CONTEXT.md`](CONTEXT.md) for the domain glossary.

## Run locally

```bash
pnpm install
pnpm dev
```

It runs on recorded Qloo fixtures by default (`QLOO_MODE=fixture`); no keys are needed. Copy [`.env.example`](.env.example) to `.env.local` to add keys.

## Privacy

Life Stories and Session Logs stay in the browser (local-first). There are no accounts and no server database for personal data, and the Person's first name never leaves the device. See [ADR-0001](docs/adr/0001-local-first-personal-data.md).

*Suggestions only, not medical advice.*

## License

[MIT](LICENSE)
