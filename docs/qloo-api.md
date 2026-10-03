# Qloo API reference (as used by Memory Lane)

Sources: the hackathon kit (github.com/qloo/qloo-hackathon-kit), docs.qloo.com (the hackathon developer guide, the insights deep dive and the parameters page), and `@qloo/qloo-harness@0.1.26`. Researched 2026-10-03.

## Base and auth
- Base URL: `https://hackathon.api.qloo.com`. Hackathon keys work only on this host; a 401 usually means the wrong host.
- Header: `X-Api-Key: <key>`. Server side only.
- Rate limits are not published. On a 429 (or a 500/502/503/504), retry with exponential backoff starting at 250 ms.
- Every endpoint is a GET with query parameters.

## Entity types
For `/v2/insights`, `filter.type` takes:
- **Entities:** `urn:entity:artist`, `book`, `brand`, `destination`, `movie`, `person`, `place`, `podcast`, `tv_show`, `videogame` (`video_game` in some docs), `locality`
- **Aggregates:** `urn:heatmap`, `urn:demographics`, `urn:tag`

## Endpoints
| Endpoint | Purpose | Key params |
|---|---|---|
| `/search` | name → entity IDs | `query`, `types`, `filter.location`, `filter.radius` (miles), `filter.popularity`, `sort_by` (match/distance/popularity), `take` (≤199), `page` |
| `/entities` | lookup by ID | `entity_ids=ID1,ID2` |
| `/v2/tags` | find tag IDs | `filter.query`, `feature.semantic_search=true`, `filter.tag.types`, `take` |
| `/v2/tags/types` | list tag categories | — |
| `/v2/audiences`, `/v2/audiences/types` | audience IDs | `filter.parents.types` |
| `/v2/insights` | affinity recommendations | see below |
| `/v2/analysis/compare` | compare two groups' tastes | `a.signal.interests.entities`, `b.signal.interests.entities`, `filter.type`, `take` |
| `/v2/trending` | an entity's trend over time | `filter.type`, `signal.interests.entities` (one entity), `filter.start_date`, `filter.end_date` |

### `/v2/insights` parameters
- **Signals**
  - `signal.interests.entities` and `signal.interests.tags`, each with an optional `.weight` (a number, or `very_low` through `very_high`).
  - `signal.demographics.age`: `24_and_younger`, `25_to_29`, `30_to_34`, `35_to_44`, `45_to_54`, `35_and_younger`, `36_to_55`, or `55_and_older`.
  - `signal.demographics.gender`: `male` or `female`.
  - `signal.demographics.audiences`: audience IDs.
  - `signal.location`: a WKT `POINT(lon lat)` or a locality. Also `signal.location.query` and `signal.location.radius` (meters, 0–800000).
- **Filters**
  - Tags and entities: `filter.tags`, `filter.exclude.tags`, `filter.exclude.entities`, `filter.results.entities` (re-ranks a given shortlist), `operator.filter.tags` (`union` or `intersection`).
  - Location: `filter.location`, `filter.location.radius` (meters), `filter.location.query`, `filter.geocode.country_code`, `filter.geocode.admin1_region`, `filter.geocode.name`.
  - Places: `filter.price_level.min/max` (1–4), `filter.rating.min/max`, `filter.hours`.
  - Other: `filter.popularity.min/max` (0–1), `filter.release_year.min/max`, `filter.content_rating`.
- **Tuning**: `bias.trends`, `diversify.by`, `diversify.take`, `feature.explainability=true`.
- **Output and paging**
  - `take` (1–50, default 20), `page`.
  - `sort_by`: `affinity`, `distance`, `rating`, or `quality`.
  - `output.heatmap.boundary`, `heatmap.dimensions`.

### Response shape
```json
{"success":true,"duration":145,"results":{"entities":[{
  "entity_id":"…","name":"…","type":"urn:entity:movie",
  "properties":{"image":{"url":"…"},"description":"…","release_year":1961},
  "tags":[{"tag_id":"…","name":"…","type":"urn:tag:genre:…"}],
  "popularity":0.75,
  "query":{"affinity":0.89,"affinity_rank":1,"explainability":{"<seedEntityId>":0.85}}
}]}}
```
- With `filter.type=urn:tag`, results come back under `results.tags`.
- With `filter.type=urn:heatmap`, results come back under `results.heatmap`.
- With `filter.type=urn:demographics`, results come back under `results.demographics`.
- With `/v2/trending`, results come back under `results.trending`.

## Gotchas
- A parameter that doesn't apply to the chosen `filter.type` is silently ignored, so a 200 with no results often means a bad parameter. Contract-test each domain.
- A 403 means the entity type isn't supported.
- `/search` and `/v2/tags` matches are candidates only. Confirm them, or ask the user when the match is ambiguous (`needs_input`).
- Results are aggregate affinities, not facts about an individual. Don't send PII.
- The image field shape varies, so treat `properties.image` defensively (it may be a string or `{url}`).

## How Memory Lane uses Qloo
| Product step | Call |
|---|---|
| Resolve a Seed | `/search` → returns `needs_input` with candidates when the match is ambiguous |
| Film/TV/book Cues | `/v2/insights`, `filter.type` = movie, tv_show or book, plus `filter.release_year.*` = Reminiscence Window, plus Seeds, plus `signal.demographics.age=55_and_older` |
| Music Cues | `filter.type=urn:entity:artist`, plus Seeds, age, and `signal.location.query=<Hometown>` |
| Dish/place Cues | `filter.type=urn:entity:place`, plus cuisine tags (`/v2/tags` semantic search) and `filter.location.query=<Care Location>` |
| Brand/object Cues | `filter.type=urn:entity:brand`, plus Seeds and age |
| Taste fingerprint | `filter.type=urn:tag`, plus Seeds |
| Provenance | `feature.explainability=true` |
| Reactions | Engaged → added to the Seeds with a weight. Distressed → `filter.exclude.entities` and `filter.exclude.tags` |
| Re-rank a shortlist | `filter.results.entities` |
| Shared listening | `/v2/analysis/compare` |
