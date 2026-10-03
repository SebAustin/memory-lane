import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canaryValues, scanDirectory } from "./scan";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "scan-bundle-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("scanDirectory", () => {
  it("reports nothing for a clean bundle", async () => {
    await writeFile(join(dir, "app.js"), "console.log('hello')");

    const result = await scanDirectory(dir, ["CANARY-ABC"]);

    expect(result.findings).toEqual([]);
    expect(result.filesScanned).toBe(1);
  });

  it("finds a planted canary in a nested file and names the file, never the value", async () => {
    await mkdir(join(dir, "chunks", "deep"), { recursive: true });
    await writeFile(join(dir, "chunks", "deep", "page.js"), 'var k="CANARY-ABC";');

    const result = await scanDirectory(dir, ["CANARY-ABC"]);

    expect(result.findings).toEqual([{ file: join("chunks", "deep", "page.js"), canaryIndex: 0 }]);
  });

  it("finds canaries inside source maps", async () => {
    await writeFile(join(dir, "main.js.map"), '{"sourcesContent":["const key = \\"CANARY-ABC\\""]}');

    const result = await scanDirectory(dir, ["CANARY-ABC"]);

    expect(result.findings).toHaveLength(1);
  });

  it("finds a canary in a binary file", async () => {
    await writeFile(join(dir, "blob.bin"), Buffer.concat([Buffer.from([0, 255, 1]), Buffer.from("CANARY-ABC")]));

    expect((await scanDirectory(dir, ["CANARY-ABC"])).findings).toHaveLength(1);
  });

  it("fails closed when the directory is missing or empty", async () => {
    await expect(scanDirectory(join(dir, "missing"), ["CANARY-ABC"])).rejects.toThrow(/not found/i);
    await expect(scanDirectory(dir, ["CANARY-ABC"])).rejects.toThrow(/no files/i);
  });

  it("refuses to run without canaries or with an empty canary", async () => {
    await writeFile(join(dir, "a.js"), "x");

    await expect(scanDirectory(dir, [])).rejects.toThrow(/canary/i);
    await expect(scanDirectory(dir, [""])).rejects.toThrow(/canary/i);
  });
});

describe("canaryValues", () => {
  it("generates distinct, unguessable canaries per run for each secret", () => {
    const a = canaryValues();
    const b = canaryValues();

    expect(Object.keys(a).sort()).toEqual(["AI_GATEWAY_API_KEY", "QLOO_API_KEY"]);
    expect(a.QLOO_API_KEY).not.toBe(a.AI_GATEWAY_API_KEY);
    expect(a.QLOO_API_KEY).not.toBe(b.QLOO_API_KEY);
    expect(a.QLOO_API_KEY.length).toBeGreaterThanOrEqual(24);
  });
});
