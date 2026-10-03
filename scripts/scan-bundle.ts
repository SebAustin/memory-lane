/**
 * Bundle canary scan (SC-11, NFR-13).
 *
 * Builds the app with random canary values for the server secrets, then fails
 * if any canary appears anywhere under `.next/static/**` (JS, CSS, source maps).
 *
 *   pnpm scan:bundle                       build + scan
 *   pnpm scan:bundle --skip-build --dir D --canary X   scan D for X only (self-test)
 *
 * Exit codes: 0 clean, 1 canary found, 2 usage or setup error (fails closed).
 */
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { canaryValues, scanDirectory } from "./lib/scan";

const EXIT_FOUND = 1;
const EXIT_USAGE = 2;

function parseOptions() {
  const { values } = parseArgs({
    options: {
      dir: { type: "string", default: ".next/static" },
      "skip-build": { type: "boolean", default: false },
      canary: { type: "string", multiple: true, default: [] },
    },
  });
  return values;
}

/**
 * Each canary is also exposed as `NEXT_PUBLIC_<NAME>`, the one way a renamed
 * variable would get inlined into client code, so that mistake fails the scan.
 */
function buildEnv(canaries: Record<string, string>): NodeJS.ProcessEnv {
  const publicCopies = Object.fromEntries(
    Object.entries(canaries).map(([name, value]) => [`NEXT_PUBLIC_${name}`, value]),
  );
  return { ...process.env, ...canaries, ...publicCopies, QLOO_MODE: "fixture", VERCEL_ENV: "" };
}

function build(canaries: Record<string, string>): void {
  console.log("scan-bundle: building with canary secrets");
  const result = spawnSync("pnpm", ["exec", "next", "build"], {
    stdio: "inherit",
    env: buildEnv(canaries),
  });
  if (result.status !== 0) throw new Error("next build failed");
}

async function main(): Promise<number> {
  const options = parseOptions();
  const secrets: Record<string, string> = options["skip-build"] ? {} : { ...canaryValues() };
  if (!options["skip-build"]) build(secrets);

  const canaries = [...Object.values(secrets), ...options.canary];
  const { findings, filesScanned } = await scanDirectory(options.dir, canaries);

  if (findings.length > 0) {
    for (const f of findings) console.error(`scan-bundle: canary #${f.canaryIndex} found in ${f.file}`);
    console.error(`scan-bundle: FAILED, ${findings.length} leak(s) in ${filesScanned} files`);
    return EXIT_FOUND;
  }
  console.log(`scan-bundle: OK, ${filesScanned} files under ${options.dir} are clean`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`scan-bundle: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(EXIT_USAGE);
  },
);
