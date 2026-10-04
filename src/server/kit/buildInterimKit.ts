import "server-only";
import { z } from "zod";
import { Cue, Notice, StoryId, type KitRequest } from "@/contracts";
import { screenByAvoidTopics } from "@/domain/screening";
import { AGE_BUCKET } from "@/domain/window";
import { logEvent, type Logger } from "@/lib/log";
import {
  DOMAIN_URN,
  type Envelope,
  type EnvelopeStatus,
  type InsightsParams,
  type QlooClient,
  type QlooEntity,
} from "@/qloo/types";
import { toMusicCue } from "./musicCue";

/**
 * The interim Kit core (ticket 02): one Qloo call for music, then everything
 * that must hold before a Cue reaches the screen. Ticket 07 grows this into
 * the six-domain prefetch and ticket 10 into `validateKit`; the handler and
 * the pages stay thin shells over `buildInterimKit`.
 *
 * Every Cue is a Qloo entity (ADR 0003); the checks below only ever remove.
 */

const MUSIC_CUE_COUNT = 15;
/** Ask for more than we show, so filtered entities do not leave the Kit short. */
const MUSIC_FETCH_TAKE = 25;
const MAX_INTERESTS = 10;

export const InterimKit = z.object({
  storyId: StoryId,
  status: z.enum(["ok", "empty", "needs_input", "partial", "degraded", "error"]),
  cues: z.array(Cue),
  notices: z.array(Notice),
});
export type InterimKit = z.infer<typeof InterimKit>;

export interface BuildInterimKitDeps {
  readonly client: QlooClient;
  readonly log?: Logger;
}

function musicParams(request: KitRequest): InsightsParams {
  const { profile, digest } = request;
  const excluded = (kind: "entity" | "tag") =>
    profile.exclusions.filter((e) => e.kind === kind).map((e) => e.id);
  return {
    filterType: DOMAIN_URN.music,
    interests: profile.seeds.slice(0, MAX_INTERESTS).map((seed) => seed.entityId),
    excludeEntities: excluded("entity"),
    excludeTags: excluded("tag"),
    age: AGE_BUCKET,
    locationQuery: digest.hometown,
    take: MUSIC_FETCH_TAKE,
  };
}

/** Ids that may never come back as Cues: Seeds, Learned Favorites and excluded entities. */
function blockedIds({ profile }: KitRequest): ReadonlySet<string> {
  return new Set([
    ...profile.seeds.map((seed) => seed.entityId),
    ...profile.learnedFavorites.map((favorite) => favorite.entityId),
    ...profile.exclusions.filter((e) => e.kind === "entity").map((e) => e.id),
  ]);
}

function noticesFor(
  envelope: Envelope<unknown>,
  cueCount: number,
  screenedOut: number,
): Notice[] {
  const notices: Notice[] = [];
  if (envelope.provenance.synthetic) {
    notices.push({
      level: "info",
      code: "fixture",
      message: "Fixture data: scores are illustrative until live Qloo data arrives",
    });
  }
  if (screenedOut > 0) {
    notices.push({
      level: "info",
      code: "validator_drops",
      message: `Left out ${screenedOut} ${screenedOut === 1 ? "Cue" : "Cues"} that matched the Avoid List.`,
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
  } else if (cueCount === 0) {
    notices.push({
      level: "warn",
      code: "omitted_domain",
      message: "No music turned up this time.",
      domain: "music",
    });
  }
  return notices;
}

function finalStatus(status: EnvelopeStatus, cueCount: number): EnvelopeStatus {
  return status === "ok" && cueCount === 0 ? "empty" : status;
}

/** Builds the music Cues for a Kit request. Never throws on Qloo trouble: it reports it. */
export async function buildInterimKit(
  request: KitRequest,
  { client, log = logEvent }: BuildInterimKitDeps,
): Promise<InterimKit> {
  const envelope = await client.insights(musicParams(request));
  const blocked = blockedIds(request);

  const candidates: readonly QlooEntity[] = (envelope.data?.entities ?? []).filter(
    (entity) => entity.domain === "music" && !blocked.has(entity.entityId),
  );
  const avoidTopics = [...new Set([...request.profile.avoidTopics, ...request.digest.avoidTopics])];
  const screened = screenByAvoidTopics(candidates, avoidTopics);

  const cues: Cue[] = [];
  let invalid = 0;
  for (const entity of screened.kept.slice(0, MUSIC_CUE_COUNT)) {
    const parsed = Cue.safeParse(toMusicCue(entity, request, envelope));
    if (parsed.success) cues.push(parsed.data);
    else invalid += 1;
  }
  if (invalid > 0) log({ event: "kit.cues_invalid", level: "warn", domain: "music", dropped: invalid });
  if (screened.dropped.length > 0) {
    log({ event: "kit.avoid_screened", domain: "music", dropped: screened.dropped.length });
  }

  return {
    storyId: request.storyId,
    status: finalStatus(envelope.status, cues.length),
    cues,
    notices: noticesFor(envelope, cues.length, screened.dropped.length),
  };
}
