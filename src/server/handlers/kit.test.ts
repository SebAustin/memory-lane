import { describe, expect, it, vi } from "vitest";
import { Cue, Notice } from "@/contracts";
import { MARGARET_PROFILE, margaretKitRequest } from "@/demo/margaret";
import { createKitHandler, loadInterimKit } from "@/server/handlers/kit";
import { createQlooClient } from "@/qloo";
import type { Envelope, QlooClient, QlooEntity } from "@/qloo/types";
import { getServerConfig } from "@/server/config";

const fixtureClient = () => createQlooClient(getServerConfig({ QLOO_MODE: "fixture" }));

const post = (body: unknown) =>
  new Request("http://localhost/api/kit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const provenance = { endpoint: "/v2/insights", paramsKey: "", cached: false, stale: false, retries: 0, ms: 0 };

/** A client that records the params it was asked for and answers with `envelope`. */
function stubClient(envelope: Envelope<{ entities: readonly QlooEntity[] }>) {
  const insights = vi.fn<QlooClient["insights"]>(async () => envelope);
  const client: QlooClient = { insights };
  return { client, insights };
}

async function jsonOf(res: Response) {
  return (await res.json()) as {
    storyId: string;
    status: string;
    cues: unknown[];
    notices: Array<{ code: string }>;
  };
}

describe("POST /api/kit (interim, music only)", () => {
  it("returns 15 music Cues for Margaret from the fixtures", async () => {
    const res = await createKitHandler({ client: fixtureClient() })(post(margaretKitRequest()));

    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.storyId).toBe("demo-margaret");
    expect(body.status).toBe("ok");
    expect(body.cues).toHaveLength(15);
    for (const cue of body.cues) {
      const parsed = Cue.parse(cue);
      expect(parsed.domain).toBe("music");
      expect(parsed.entityId.startsWith("fx-")).toBe(true);
    }
  });

  it("never repeats a Cue or returns a Seed as a Cue", async () => {
    const body = await jsonOf(
      await createKitHandler({ client: fixtureClient() })(post(margaretKitRequest())),
    );
    const ids = (body.cues as Array<{ entityId: string }>).map((cue) => cue.entityId);

    expect(new Set(ids).size).toBe(ids.length);
    for (const seedId of MARGARET_PROFILE.seedIds) expect(ids).not.toContain(seedId);
  });

  it("labels fixture data with a notice", async () => {
    const body = await jsonOf(
      await createKitHandler({ client: fixtureClient() })(post(margaretKitRequest())),
    );
    const codes = body.notices.map((notice) => Notice.parse(notice).code);
    expect(codes).toContain("fixture");
  });

  it("keeps the first name out of the response: the text carries the {name} placeholder", async () => {
    const res = await createKitHandler({ client: fixtureClient() })(post(margaretKitRequest()));
    const text = await res.text();

    expect(text).not.toContain("Margaret");
    expect(text).toContain("{name}");
  });

  it("credits each Cue to the Seeds that drove it, using the digest's Seed names", async () => {
    const body = await jsonOf(
      await createKitHandler({ client: fixtureClient() })(post(margaretKitRequest())),
    );
    const first = Cue.parse(body.cues[0]);

    expect(first.provenance.seeds.length).toBeGreaterThan(0);
    expect(first.provenance.seeds.map((s) => s.name)).toContain("Patsy Cline");
    expect(first.provenance.signalsOnly).toBe(false);
    expect(first.provenance.synthetic).toBe(true);
    expect(first.provenance.signals).toMatchObject({ ageBucket: "55_and_older", hometown: "Memphis" });
  });

  it("asks Qloo for artists with the Seeds, the 55+ cohort and the Hometown as signals", async () => {
    const { client, insights } = stubClient({
      status: "empty",
      data: { entities: [] },
      provenance,
    });

    await loadInterimKit(margaretKitRequest(), { client });

    expect(insights).toHaveBeenCalledTimes(1);
    expect(insights.mock.calls[0]?.[0]).toMatchObject({
      filterType: "urn:entity:artist",
      interests: MARGARET_PROFILE.seedIds,
      age: "55_and_older",
      locationQuery: "Memphis",
      take: 15,
    });
  });

  it("passes Exclusions from the Taste Profile to Qloo and never shows an excluded Cue", async () => {
    const request = {
      ...margaretKitRequest(),
      profile: {
        ...MARGARET_PROFILE,
        exclusions: [
          { kind: "entity" as const, id: "fx-artist-loretta-lynn", label: "Loretta Lynn", source: "reaction" as const, addedAt: "2026-10-03T12:00:00.000Z" },
          { kind: "tag" as const, id: "fx-tag-soul", label: "Soul", source: "reaction" as const, addedAt: "2026-10-03T12:00:00.000Z" },
        ],
      },
    };

    const body = await jsonOf(
      await createKitHandler({ client: fixtureClient() })(post(request)),
    );
    const cues = body.cues.map((cue) => Cue.parse(cue));

    expect(cues).toHaveLength(15);
    expect(cues.map((c) => c.entityId)).not.toContain("fx-artist-loretta-lynn");
    expect(cues.flatMap((c) => c.tags.map((t) => t.id))).not.toContain("fx-tag-soul");
  });

  it("reports an empty domain instead of failing when nothing matches the Hometown", async () => {
    const request = margaretKitRequest();
    const atlantis = { ...request, digest: { ...request.digest, hometown: "Atlantis" } };

    const res = await createKitHandler({ client: fixtureClient() })(post(atlantis));
    const body = await jsonOf(res);

    expect(res.status).toBe(200);
    expect(body.status).toBe("empty");
    expect(body.cues).toEqual([]);
    expect(body.notices.map((n) => n.code)).toContain("omitted_domain");
  });

  it("reports an upstream error envelope as a notice with no Cues", async () => {
    const { client } = stubClient({
      status: "error",
      data: null,
      errorCode: "upstream",
      provenance,
    });

    const body = await jsonOf(await createKitHandler({ client })(post(margaretKitRequest())));

    expect(body.status).toBe("error");
    expect(body.cues).toEqual([]);
    expect(body.notices.map((n) => n.code)).toEqual(["upstream_error"]);
  });

  it("drops entities that are not music Cues", async () => {
    const film = { entityId: "fx-film-x", name: "X", type: "urn:entity:movie", domain: "film", imageUrl: null, tags: [], affinity: 0.5, explainability: {} } as const;
    const { client } = stubClient({ status: "ok", data: { entities: [film] }, provenance });

    const body = await jsonOf(await createKitHandler({ client })(post(margaretKitRequest())));

    expect(body.cues).toEqual([]);
  });

  it("answers 502 with a generic body when the client misbehaves and throws", async () => {
    const client: QlooClient = {
      insights: async () => {
        throw new Error("boom: secret internals");
      },
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await createKitHandler({ client })(post(margaretKitRequest()));
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(text).not.toContain("secret internals");
    spy.mockRestore();
  });

  it("answers 400 to a request carrying the first name or any unknown key", async () => {
    const handler = createKitHandler({ client: fixtureClient() });
    const smuggled = { ...margaretKitRequest(), digest: { ...margaretKitRequest().digest, firstName: "Margaret" } };

    expect((await handler(post(smuggled))).status).toBe(400);
    expect((await handler(post({ ...margaretKitRequest(), extra: true }))).status).toBe(400);
  });

  it("answers 413 to an oversized body", async () => {
    const huge = { ...margaretKitRequest(), previousCueIds: [], pad: "x".repeat(20_000) };
    const res = await createKitHandler({ client: fixtureClient() })(post(huge));
    expect(res.status).toBe(413);
  });
});
