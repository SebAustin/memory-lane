import { afterEach, describe, expect, it, vi } from "vitest";
import { margaretKitRequest } from "@/demo/margaret";
import { createQlooClient } from "@/qloo";
import type { QlooClient } from "@/qloo/types";
import { getServerConfig } from "@/config/server-config";
import { createKitHandler } from "@/server/handlers/kit";

afterEach(() => {
  vi.restoreAllMocks();
});

const fixtureClient = () => createQlooClient(getServerConfig({ QLOO_MODE: "fixture" }));

const post = (body: unknown) =>
  new Request("http://localhost/api/kit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/kit (interim, music only)", () => {
  it("answers 200 with the validated interim Kit", async () => {
    const res = await createKitHandler({ client: fixtureClient() })(post(margaretKitRequest()));
    const body = (await res.json()) as { storyId: string; status: string; cues: unknown[] };

    expect(res.status).toBe(200);
    expect(body.storyId).toBe("demo-margaret");
    expect(body.status).toBe("ok");
    expect(body.cues).toHaveLength(15);
  });

  it("answers 400 to a request carrying the first name or any unknown key", async () => {
    const handler = createKitHandler({ client: fixtureClient() });
    const request = margaretKitRequest();

    expect((await handler(post({ ...request, digest: { ...request.digest, firstName: "Margaret" } }))).status).toBe(400);
    expect((await handler(post({ ...request, extra: true }))).status).toBe(400);
    // The old parallel-array shape (ids only, no names) is no longer a valid Taste Profile.
    const idsOnly = { ...request.profile, seeds: undefined, seedIds: ["a", "b"] };
    expect((await handler(post({ ...request, profile: idsOnly }))).status).toBe(400);
  });

  it("answers 413 to an oversized body", async () => {
    const res = await createKitHandler({ client: fixtureClient() })(
      post({ ...margaretKitRequest(), pad: "x".repeat(20_000) }),
    );
    expect(res.status).toBe(413);
  });

  it("answers 400, not a crash, when the body stream breaks", async () => {
    const broken = new Request("http://localhost/api/kit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new ReadableStream({ start: (controller) => controller.error(new Error("socket hang up")) }),
      duplex: "half",
    } as RequestInit);

    const res = await createKitHandler({ client: fixtureClient() })(broken);

    expect(res.status).toBe(400);
  });

  it("answers 500 (our bug, not an upstream one) with a generic body when the client throws", async () => {
    const client: QlooClient = {
      insights: async () => {
        throw new Error("boom: secret internals");
      },
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await createKitHandler({ client })(post(margaretKitRequest()));
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).not.toContain("secret internals");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toEqual({
      level: "error",
      event: "kit.handler_error",
      error: "Error",
    });
  });

  it("copes with a client that throws something that is not an Error", async () => {
    const client: QlooClient = {
      insights: async () => {
        throw "a string";
      },
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await createKitHandler({ client })(post(margaretKitRequest()));

    expect(res.status).toBe(500);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0])).error).toBe("unknown");
  });
});
