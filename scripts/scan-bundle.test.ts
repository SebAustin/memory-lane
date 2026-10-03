import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CANARY = "canary-selftest-7f3a91c2e5d84b60";
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "scan-bundle-cli-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function runCli(...extra: string[]) {
  return spawnSync(
    "pnpm",
    ["exec", "tsx", "scripts/scan-bundle.ts", "--skip-build", "--dir", dir, "--canary", CANARY, ...extra],
    { encoding: "utf8" },
  );
}

describe("scripts/scan-bundle.ts self-test (SC-11)", () => {
  it("exits non-zero when a canary is planted in the bundle", async () => {
    await writeFile(join(dir, "page.js"), `window.k="${CANARY}"`);

    const result = runCli();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("page.js");
    expect(result.stderr).not.toContain(CANARY);
  });

  it("exits zero for a clean bundle", async () => {
    await writeFile(join(dir, "page.js"), "window.k=1");

    expect(runCli().status).toBe(0);
  });

  it("exits 2 on bad usage so CI cannot pass by accident", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", "scripts/scan-bundle.ts", "--dir", join(dir, "nope"), "--skip-build"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(2);
  });
});
