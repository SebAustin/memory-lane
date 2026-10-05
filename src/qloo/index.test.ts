import { describe, expect, it, vi } from "vitest";
import { createQlooClient } from "@/qloo";
import { createTieredCache } from "@/qloo/cache";
import { HttpQlooClient } from "@/qloo/http";
import { FixtureQlooClient } from "@/qloo/fixture";
import { getServerConfig } from "@/server/config";

const MUSIC = { filterType: "urn:entity:artist", locationQuery: "Memphis" } as const;

describe("createQlooClient selects the adapter by QLOO_MODE (NFR-19)", () => {
  it("builds the fixture client by default, with no key and no network", async () => {
    const fetch = vi.fn();
    const client = createQlooClient(getServerConfig({}), { fetch: fetch as unknown as typeof globalThis.fetch });

    expect(client).toBeInstanceOf(FixtureQlooClient);
    const env = await client.insights(MUSIC);
    expect(env.provenance.synthetic).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("builds the HTTP client in live mode and sends the configured key and host", async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ results: { entities: [] } }), { status: 200 }),
    );
    const config = getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "live-key", QLOO_BASE_URL: "https://example.qloo.com" });
    const client = createQlooClient(config, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      cache: createTieredCache({ lruMax: 5 }),
      log: () => undefined,
    });

    expect(client).toBeInstanceOf(HttpQlooClient);
    await client.insights(MUSIC);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).origin).toBe("https://example.qloo.com");
    expect(new Headers(init.headers).get("x-api-key")).toBe("live-key");
  });

  it("uses the hackathon host unless told otherwise", async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ results: { entities: [] } }), { status: 200 }),
    );
    const client = createQlooClient(getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "k" }), {
      fetch: fetch as unknown as typeof globalThis.fetch,
      cache: createTieredCache({ lruMax: 5 }),
      log: () => undefined,
    });
    await client.insights(MUSIC);
    expect(new URL((fetch.mock.calls[0] as unknown as [string])[0]).origin).toBe("https://hackathon.api.qloo.com");
  });

  it("refuses a live config that has no key, rather than calling Qloo unauthenticated", () => {
    const config = { ...getServerConfig({}), qlooMode: "live" as const };
    expect(() => createQlooClient(config)).toThrow(/QLOO_API_KEY/);
  });

  it("passes the image allow-list through to the live client", async () => {
    const entity = {
      entity_id: "a-1",
      name: "A",
      type: "urn:entity:artist",
      properties: { image: "https://images.qloo.com/a.jpg" },
    };
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ results: { entities: [entity] } }), { status: 200 }),
    );
    const config = getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "k", QLOO_IMAGE_HOSTS: "images.qloo.com" });
    const client = createQlooClient(config, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      cache: createTieredCache({ lruMax: 5 }),
      log: () => undefined,
    });

    const env = await client.insights(MUSIC);
    expect(env.data?.entities[0]?.imageUrl).toBe("https://images.qloo.com/a.jpg");
  });
});
