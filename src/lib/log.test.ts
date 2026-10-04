import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "@/lib/log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logEvent", () => {
  it("writes one JSON line per event on the console channel for its level", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logEvent({ event: "a", count: 2 });
    logEvent({ event: "b", level: "warn" });
    logEvent({ event: "c", level: "error", ok: false });

    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toEqual({ level: "info", event: "a", count: 2 });
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({ level: "warn", event: "b" });
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toEqual({ level: "error", event: "c", ok: false });
  });
});
