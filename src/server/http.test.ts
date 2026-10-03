import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonError, parseJson } from "@/server/http";

const Body = z.object({ n: z.number().int() }).strict();
const MAX = 64;

const post = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://localhost/api/test", { method: "POST", body, headers });

async function bodyOf(res: Response): Promise<unknown> {
  return res.json();
}

describe("parseJson", () => {
  it("returns the parsed value for a valid body", async () => {
    const result = await parseJson(post('{"n":3}'), Body, MAX);
    expect(result).toEqual({ n: 3 });
  });

  it("applies schema defaults and transforms", async () => {
    const WithDefault = z.object({ mode: z.string().default("live") });
    expect(await parseJson(post("{}"), WithDefault, MAX)).toEqual({ mode: "live" });
  });

  it("answers 400 for malformed JSON", async () => {
    const result = await parseJson(post("{nope"), Body, MAX);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it("answers 400 for a body that fails the schema, including unknown keys", async () => {
    for (const body of ['{"n":"x"}', '{"n":1,"firstName":"Margaret"}', "[]", "null"]) {
      const result = await parseJson(post(body), Body, MAX);
      expect((result as Response).status, body).toBe(400);
    }
  });

  it("answers 400 when the content type is not JSON", async () => {
    const result = await parseJson(post('{"n":1}', { "content-type": "text/plain" }), Body, MAX);
    expect((result as Response).status).toBe(400);
  });

  it("answers 413 when content-length already exceeds the cap, without reading the body", async () => {
    const req = post('{"n":1}', { "content-type": "application/json", "content-length": "9999" });
    const result = await parseJson(req, Body, MAX);
    expect((result as Response).status).toBe(413);
  });

  it("answers 413 when the real body exceeds the cap even without a content-length", async () => {
    const big = JSON.stringify({ n: 1, pad: "x".repeat(MAX * 2) });
    const result = await parseJson(post(big), Body, MAX);
    expect((result as Response).status).toBe(413);
  });

  it("answers 400 for an empty body", async () => {
    const result = await parseJson(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
      }),
      Body,
      MAX,
    );
    expect((result as Response).status).toBe(400);
  });

  it("returns a generic error that never echoes the input", async () => {
    const result = (await parseJson(post('{"n":"SECRET-VALUE"}'), Body, MAX)) as Response;
    const text = JSON.stringify(await bodyOf(result));
    expect(text).not.toContain("SECRET-VALUE");
    expect(result.headers.get("content-type")).toContain("application/json");
  });
});

describe("jsonError", () => {
  it("builds a JSON error response with the status and extra headers", async () => {
    const res = jsonError(429, "rate_limited", "Slow down.", { "retry-after": "30" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(await res.json()).toEqual({ error: "rate_limited", message: "Slow down." });
  });
});
