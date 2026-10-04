import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDemoKit, loadDemoSampleCues } from "@/server/kit/demoKit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("demo Kit loaders", () => {
  it("loads Margaret's Kit in fixture mode", async () => {
    vi.stubEnv("QLOO_MODE", "fixture");
    expect((await loadDemoKit()).cues).toHaveLength(15);
  });

  it("returns the first Cues, each with its Qloo entity id, as landing samples", async () => {
    vi.stubEnv("QLOO_MODE", "fixture");
    const samples = await loadDemoSampleCues(3);

    expect(samples).toHaveLength(3);
    expect(samples.every((cue) => cue.entityId.startsWith("fx-"))).toBe(true);
  });

  it("returns no samples, and logs, when the environment is bad", async () => {
    vi.stubEnv("QLOO_MODE", "live");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(await loadDemoSampleCues(3)).toEqual([]);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0])).event).toBe("landing.samples_unavailable");
  });
});
