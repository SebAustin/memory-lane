import "server-only";
import { AGE_BUCKET } from "@/domain/window";
import type { Cue, KitRequest } from "@/contracts";
import type { Envelope, EnvelopeStatus, QlooEntity } from "@/qloo/types";

/** Placeholder text. `{name}` is filled in on the device at render time only. */
export const MUSIC_WHY_THIS = "Often loved by people who share {name}'s era, hometown and favorites.";
export const MUSIC_PROMPT = "Tell me about the music you loved when you were young.";

const MAX_CUE_TAGS = 3;

type CueEnvelope = Cue["provenance"]["envelope"];

/** Only results that carry Cues can be `ok`, `partial` or `degraded`. */
function provenanceEnvelope(status: EnvelopeStatus): CueEnvelope {
  return status === "partial" || status === "degraded" ? status : "ok";
}

/**
 * Turns a validated Qloo artist into a music Cue. The Seed names come from the
 * request's `{entityId, name}` pairs, so a contribution is credited only to a
 * Seed the Caregiver actually has.
 */
export function toMusicCue(
  entity: QlooEntity,
  request: KitRequest,
  envelope: Envelope<unknown>,
): Cue {
  const seedNames = new Map(request.profile.seeds.map((seed) => [seed.entityId, seed.name]));
  const seeds = Object.entries(entity.explainability).flatMap(([entityId, score]) => {
    const name = seedNames.get(entityId);
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
      envelope: provenanceEnvelope(envelope.status),
    },
  };
}
