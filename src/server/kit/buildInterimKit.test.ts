import { describe, expect, it, vi } from "vitest";
import { Cue, type KitRequest } from "@/contracts";
import { MARGARET_PROFILE, margaretKitRequest } from "@/demo/margaret";
import { createQlooClient } from "@/qloo";
import type { Envelope, EnvelopeStatus, QlooClient, QlooEntity } from "@/qloo/types";
import { getServerConfig } from "@/config/server-config";
import type { LogEvent } from "@/lib/log";
import { SENSITIVE_TAG_IDS } from "@/domain/sensitiveTags";
import { buildInterimKit } from "@/server/kit/buildInterimKit";

const fixtureClient = () => createQlooClient(getServerConfig({ QLOO_MODE: "fixture" }));

const provenance = { endpoint: "/v2/insights", paramsKey: "", cached: false, stale: false, retries: 0, ms: 0 };

const entity = (entityId: string, name: string, extra: Partial<QlooEntity> = {}): QlooEntity => ({
  entityId,
  name,
  type: "urn:entity:artist",
  domain: "music",
  imageUrl: null,
  tags: [],
  affinity: 0.5,
  explainability: {},
  ...extra,
});

const envelopeOf = (
  entities: readonly QlooEntity[],
  status: EnvelopeStatus = "ok",
): Envelope<{ entities: readonly QlooEntity[] }> => ({ status, data: { entities }, provenance });

/** A client that records the params it was asked for and answers with `envelope`. */
function stubClient(envelope: Envelope<{ entities: readonly QlooEntity[] }>) {
  const insights = vi.fn<QlooClient["insights"]>(async () => envelope);
  return { client: { insights } satisfies Pick<QlooClient, "insights">, insights };
}

const recorder = () => {
  const events: LogEvent[] = [];
  return { events, log: (event: LogEvent) => void events.push(event) };
};

/** `n` unremarkable artists, so a stub can return a realistic over-fetch. */
const artists = (n: number) =>
  Array.from({ length: n }, (_, i) => entity(`fx-artist-extra-${i}`, `Extra Artist ${i}`, { affinity: 0.4 }));

const build = (request: KitRequest, client: Pick<QlooClient, "insights">, log = recorder().log) =>
  buildInterimKit(request, { client, log });

describe("buildInterimKit against the fixtures", () => {
  it("returns 15 music Cues, unique and all from Qloo fixtures", async () => {
    const kit = await build(margaretKitRequest(), fixtureClient());
    const ids = kit.cues.map((cue) => cue.entityId);

    expect(kit.status).toBe("ok");
    expect(kit.cues).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    for (const cue of kit.cues) {
      expect(Cue.safeParse(cue).success).toBe(true);
      expect(cue.entityId.startsWith("fx-")).toBe(true);
    }
  });

  it("keeps the Seed the fixture echoes back, and the Avoid-topic match, off the page", async () => {
    const kit = await build(margaretKitRequest(), fixtureClient());
    const names = kit.cues.map((cue) => cue.name);

    expect(names).not.toContain("Patsy Cline");
    expect(names).not.toContain("Tennessee Waltz Revue");
    expect(kit.notices.map((n) => n.code)).toEqual(["fixture", "validator_drops"]);
    expect(kit.notices.find((n) => n.code === "validator_drops")?.message).toBe(
      "Left out 1 Cue that matched the Avoid List.",
    );
  });

  it("labels fixture data and never carries the first name", async () => {
    const kit = await build(margaretKitRequest(), fixtureClient());
    const text = JSON.stringify(kit);

    expect(kit.notices[0]?.code).toBe("fixture");
    expect(text).not.toContain("Margaret");
    expect(text).toContain("{name}");
  });

  it("credits each Cue to the Seeds that drove it, by the names in the request's pairs", async () => {
    const kit = await build(margaretKitRequest(), fixtureClient());
    const first = kit.cues[0];

    expect(first?.provenance.seeds.map((s) => s.name)).toContain("Patsy Cline");
    expect(first?.provenance).toMatchObject({
      signalsOnly: false,
      synthetic: true,
      envelope: "ok",
      signals: { ageBucket: "55_and_older", hometown: "Memphis" },
    });
  });

  it("reports an empty domain when nothing matches the Hometown", async () => {
    const request = margaretKitRequest();
    const kit = await build({ ...request, digest: { ...request.digest, hometown: "Atlantis" } }, fixtureClient());

    expect(kit.status).toBe("empty");
    expect(kit.cues).toEqual([]);
    expect(kit.notices.map((n) => n.code)).toContain("omitted_domain");
  });
});

describe("buildInterimKit filters (the checks only ever remove)", () => {
  it("asks Qloo for artists with the Seeds, the 55+ cohort and the Hometown, over-fetching to 25", async () => {
    const { client, insights } = stubClient(envelopeOf([]));

    await build(margaretKitRequest(), client);

    expect(insights).toHaveBeenCalledTimes(1);
    expect(insights.mock.calls[0]?.[0]).toMatchObject({
      filterType: "urn:entity:artist",
      interests: MARGARET_PROFILE.seeds.map((seed) => seed.entityId),
      age: "55_and_older",
      locationQuery: "Memphis",
      take: 25,
    });
  });

  it("drops a Seed that Qloo returns as a Cue (M4)", async () => {
    const seedId = MARGARET_PROFILE.seeds[0]?.entityId ?? "";
    const { client } = stubClient(envelopeOf([entity(seedId, "Patsy Cline"), entity("fx-a", "Other")]));

    const kit = await build(margaretKitRequest(), client);

    expect(kit.cues.map((c) => c.entityId)).toEqual(["fx-a"]);
  });

  it("drops a Learned Favorite that Qloo returns as a Cue", async () => {
    const request = margaretKitRequest();
    const withFavorite: KitRequest = {
      ...request,
      profile: {
        ...request.profile,
        learnedFavorites: [
          { entityId: "fx-loved", name: "Loved", domain: "music", weight: 1, fromSessionId: "s1" },
        ],
      },
    };
    const { client } = stubClient(envelopeOf([entity("fx-loved", "Loved"), entity("fx-b", "Other")]));

    const kit = await build(withFavorite, client);

    expect(kit.cues.map((c) => c.entityId)).toEqual(["fx-b"]);
  });

  it("drops an excluded entity even when the client ignores the exclusion", async () => {
    const request = margaretKitRequest();
    const excluded: KitRequest = {
      ...request,
      profile: {
        ...request.profile,
        exclusions: [
          { kind: "entity", id: "fx-no", label: "No", source: "reaction", addedAt: "2026-10-03T12:00:00.000Z" },
          { kind: "tag", id: "fx-tag-no", label: "No tag", source: "reaction", addedAt: "2026-10-03T12:00:00.000Z" },
        ],
      },
    };
    const { client, insights } = stubClient(envelopeOf([entity("fx-no", "No"), entity("fx-yes", "Yes")]));

    const kit = await build(excluded, client);

    expect(kit.cues.map((c) => c.entityId)).toEqual(["fx-yes"]);
    expect(insights.mock.calls[0]?.[0]).toMatchObject({
      excludeEntities: ["fx-no"],
      excludeTags: ["fx-tag-no", ...SENSITIVE_TAG_IDS],
    });
  });

  it("excludes the sensitive-theme tags unless the Caregiver opted in (FR-5)", async () => {
    const request = margaretKitRequest();
    const { client, insights } = stubClient(envelopeOf([entity("fx-yes", "Yes")]));

    await build(request, client);
    await build({ ...request, digest: { ...request.digest, sensitiveThemesOptIn: true } }, client);

    expect(insights.mock.calls[0]?.[0].excludeTags).toEqual(SENSITIVE_TAG_IDS);
    expect(insights.mock.calls[1]?.[0].excludeTags).toEqual([]);
  });

  it("asks Qloo for no more than 10 interests, Seeds first (NFR-11)", async () => {
    const request = margaretKitRequest();
    const favorites = Array.from({ length: 12 }, (_, i) => ({
      entityId: `fx-lf-${i}`,
      name: `Favorite ${i}`,
      domain: "music" as const,
      weight: 1,
      fromSessionId: "s1",
    }));
    const { client, insights } = stubClient(envelopeOf([entity("fx-yes", "Yes")]));

    await build({ ...request, profile: { ...request.profile, learnedFavorites: favorites } }, client);

    const interests = insights.mock.calls[0]?.[0].interests ?? [];
    expect(interests).toHaveLength(10);
    expect(interests.slice(0, 3)).toEqual(request.profile.seeds.map((seed) => seed.entityId));
  });

  it("drops an entity whose name matches an Avoid topic, with a notice (PLAN section 14.1)", async () => {
    const { client } = stubClient(
      envelopeOf([entity("fx-waltz", "Tennessee Waltz Revue"), entity("fx-ok", "Waltz Across Texas")]),
    );
    const { events, log } = recorder();

    const kit = await build(margaretKitRequest(), client, log);

    expect(kit.cues.map((c) => c.entityId)).toEqual(["fx-ok"]);
    expect(kit.notices.map((n) => n.code)).toContain("validator_drops");
    expect(events).toEqual([{ event: "kit.avoid_screened", domain: "music", dropped: 1 }]);
  });

  it("matches topics from the digest as well as the Taste Profile", async () => {
    const request = margaretKitRequest();
    const onlyInDigest: KitRequest = {
      ...request,
      profile: { ...request.profile, avoidTopics: [] },
      digest: { ...request.digest, avoidTopics: ["hospitals"] },
    };
    const { client } = stubClient(envelopeOf([entity("fx-h", "General Hospital"), entity("fx-ok", "Fine")]));

    const kit = await build(onlyInDigest, client);

    expect(kit.cues.map((c) => c.entityId)).toEqual(["fx-ok"]);
  });

  it("still returns 15 Cues when filters remove some of the 25 it asked for", async () => {
    const seedId = MARGARET_PROFILE.seeds[0]?.entityId ?? "";
    const { client } = stubClient(
      envelopeOf([entity(seedId, "Patsy Cline"), entity("fx-waltz", "Tennessee Waltz Revue"), ...artists(20)]),
    );

    const kit = await build(margaretKitRequest(), client);

    expect(kit.cues).toHaveLength(15);
  });

  it("drops entities that are not music", async () => {
    const film = entity("fx-film-x", "X", { domain: "film", type: "urn:entity:movie" });
    const kit = await build(margaretKitRequest(), stubClient(envelopeOf([film])).client);

    expect(kit.cues).toEqual([]);
    expect(kit.status).toBe("empty");
  });

  it("reports empty, not ok, when every entity was filtered out", async () => {
    const kit = await build(
      margaretKitRequest(),
      stubClient(envelopeOf([entity("fx-waltz", "Tennessee Waltz Revue")])).client,
    );

    expect(kit.status).toBe("empty");
    expect(kit.notices.map((n) => n.code)).toEqual(["validator_drops", "omitted_domain"]);
  });

  it("drops a Cue that fails the Cue contract and logs the count, never the name", async () => {
    const bad = entity("fx-bad", "Secret Name", { imageUrl: "javascript:alert(1)" });
    const { events, log } = recorder();

    const kit = await build(margaretKitRequest(), stubClient(envelopeOf([bad, entity("fx-ok", "Fine")])).client, log);

    expect(kit.cues.map((c) => c.entityId)).toEqual(["fx-ok"]);
    expect(events).toEqual([{ event: "kit.cues_invalid", level: "warn", domain: "music", dropped: 1 }]);
    expect(JSON.stringify(events)).not.toContain("Secret Name");
  });
});

describe("buildInterimKit envelope handling", () => {
  it("reports an upstream error with no Cues and no empty-domain notice on top", async () => {
    const { client } = stubClient({ status: "error", data: null, errorCode: "upstream", provenance });

    const kit = await build(margaretKitRequest(), client);

    expect(kit.status).toBe("error");
    expect(kit.cues).toEqual([]);
    expect(kit.notices.map((n) => n.code)).toEqual(["upstream_error"]);
  });

  it.each(["partial", "degraded"] as const)("carries a %s envelope into each Cue's provenance", async (status) => {
    const kit = await build(margaretKitRequest(), stubClient(envelopeOf([entity("fx-a", "A")], status)).client);

    expect(kit.cues[0]?.provenance.envelope).toBe(status);
  });

  it("ignores explainability for ids that are not the Caregiver's Seeds", async () => {
    const stranger = entity("fx-a", "A", { explainability: { "someone-else": 0.9 } });
    const kit = await build(margaretKitRequest(), stubClient(envelopeOf([stranger])).client);

    expect(kit.cues[0]?.provenance.seeds).toEqual([]);
    expect(kit.cues[0]?.provenance.signalsOnly).toBe(true);
  });
});
