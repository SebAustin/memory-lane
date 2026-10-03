import "server-only";
import { z } from "zod";
import { Cue, KitRequest, Notice, type KitRequest as KitRequestValue } from "@/contracts";
import { AGE_BUCKET } from "@/domain/window";
import { DOMAIN_URN, type Envelope, type QlooClient, type QlooEntity } from "@/qloo/types";
import { jsonError, parseJson } from "@/server/http";

/**
 * INTERIM `/api/kit` handler (ticket 02). Returns plain JSON with the music
 * Cues only. Ticket 15 replaces it with the streamed Kit; ticket 07 adds the
 * other five domains and the prefetch ladder. Written as a handler factory
 * (seam 8) so tests and the Kit page call it without a running server.
 */

const MAX_BODY_BYTES = 16 * 1024;
const MUSIC_CUE_COUNT = 15;
const MAX_INTERESTS = 10;
const MAX_CUE_TAGS = 3;

/** Placeholder text. `{name}` is filled in on the device at render time only. */
const MUSIC_WHY_THIS = "Often loved by people who share {name}'s era, hometown and favorites.";
const MUSIC_PROMPT = "Tell me about the music you loved when you were young.";
const FIXTURE_NOTICE = "Fixture data: scores are illustrative until live Qloo data arrives";

export const InterimKit = z.object({
  storyId: KitRequest.shape.storyId,
  status: z.enum(["ok", "empty", "needs_input", "partial", "degraded", "error"]),
  cues: z.array(Cue),
  notices: z.array(Notice),
});
export type InterimKit = z.infer<typeof InterimKit>;

export interface KitHandlerDeps {
  readonly client: QlooClient;
}

function musicParams(request: KitRequestValue) {
  const { profile, digest } = request;
  const excluded = (kind: "entity" | "tag") =>
    profile.exclusions.filter((e) => e.kind === kind).map((e) => e.id);
  return {
    filterType: DOMAIN_URN.music,
    interests: profile.seedIds.slice(0, MAX_INTERESTS),
    excludeEntities: excluded("entity"),
    excludeTags: excluded("tag"),
    age: AGE_BUCKET,
    locationQuery: digest.hometown,
    take: MUSIC_CUE_COUNT,
  } as const;
}

/** Seed names, assuming `digest.seedNames[i]` belongs to `profile.seedIds[i]`. */
function seedNameById(request: KitRequestValue): ReadonlyMap<string, string> {
  const { seedIds } = request.profile;
  const { seedNames } = request.digest;
  return new Map(seedIds.flatMap((id, i) => (seedNames[i] === undefined ? [] : [[id, seedNames[i]]])));
}

function toMusicCue(
  entity: QlooEntity,
  request: KitRequestValue,
  names: ReadonlyMap<string, string>,
  envelope: Envelope<unknown>,
): Cue {
  const seeds = Object.entries(entity.explainability).flatMap(([entityId, score]) => {
    const name = names.get(entityId);
    return name === undefined ? [] : [{ entityId, name, score, learned: false }];
  });
  return {
    entityId: entity.entityId,
    domain: "music",
    name: entity.name,
    ...(entity.year === undefined ? {} : { year: entity.year }),
    imageUrl: entity.imageUrl,
    tags: entity.tags.slice(0, MAX_CUE_TAGS).map((tag) => ({ id: tag.id, name: tag.name })),
    outsideWindow: false,
    whyThis: MUSIC_WHY_THIS,
    prompts: [MUSIC_PROMPT],
    provenance: {
      affinity: entity.affinity ?? 0,
      seeds,
      signals: { ageBucket: AGE_BUCKET, hometown: request.digest.hometown },
      signalsOnly: seeds.length === 0,
      cached: envelope.provenance.cached,
      synthetic: envelope.provenance.synthetic ?? false,
      recordedExample: false,
      envelope: "ok",
    },
  };
}

function noticesFor(envelope: Envelope<unknown>): Notice[] {
  const notices: Notice[] = [];
  if (envelope.provenance.synthetic) {
    notices.push({ level: "info", code: "fixture", message: FIXTURE_NOTICE });
  }
  if (envelope.status === "empty") {
    notices.push({
      level: "warn",
      code: "omitted_domain",
      message: "No music turned up this time.",
      domain: "music",
    });
  }
  if (envelope.status === "error") {
    notices.push({
      level: "error",
      code: "upstream_error",
      message: "Qloo could not be reached, so there is no music this time.",
      domain: "music",
    });
  }
  return notices;
}

/** The handler's core, shared with the Kit page: a validated request in, music Cues out. */
export async function loadInterimKit(
  request: KitRequestValue,
  { client }: KitHandlerDeps,
): Promise<InterimKit> {
  const envelope = await client.insights(musicParams(request));
  const names = seedNameById(request);
  const cues = (envelope.data?.entities ?? [])
    .filter((entity) => entity.domain === "music")
    .map((entity) => toMusicCue(entity, request, names, envelope));

  return {
    storyId: request.storyId,
    status: envelope.status,
    cues,
    notices: noticesFor(envelope),
  };
}

/** `POST /api/kit`: `(Request) => Response`, thin enough for the route file to wrap. */
export function createKitHandler(deps: KitHandlerDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    const request = await parseJson(req, KitRequest, MAX_BODY_BYTES);
    if (request instanceof Response) return request;
    try {
      return Response.json(await loadInterimKit(request, deps));
    } catch (error) {
      console.error(JSON.stringify({ event: "kit.handler_error", name: (error as Error).name }));
      return jsonError(502, "upstream_error", "We couldn't build the Kit this time.");
    }
  };
}
