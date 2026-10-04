import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const at = (path: string) => `${root}${path}`;

interface Threshold {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

const uniform = (pct: number): Threshold => ({
  statements: pct,
  branches: pct,
  functions: pct,
  lines: pct,
});

/**
 * Coverage gates (SC-15, NFR-23). A gate is only registered once the files it
 * guards exist, so the skeleton is green while later tickets land the modules:
 * src/domain/** >= 80%, the validator >= 90%, src/qloo/** >= 80%, plus
 * src/server/** and src/config/** >= 80%. Ticket 10 may name the validator
 * `validator.ts`, `validator*.ts` or `validator/*.ts` (its ticket allows the
 * first and the last), so each form has its own gate and registers when present.
 */
const gates: ReadonlyArray<readonly [glob: string, probe: string, pct: number]> = [
  ["src/domain/**", "src/domain", 80],
  ["src/domain/validator*.ts", "src/domain/validator.ts", 90],
  ["src/domain/validator/**", "src/domain/validator", 90],
  ["src/qloo/**", "src/qloo", 80],
  ["src/server/**", "src/server", 80],
  ["src/config/**", "src/config", 80],
];

const thresholds = Object.fromEntries(
  gates
    .filter(([, probe]) => existsSync(at(probe)))
    .map(([glob, , pct]) => [glob, uniform(pct)]),
);

export default defineConfig({
  resolve: {
    alias: {
      // Lets server-only modules be imported by unit tests.
      "server-only": at("test/stubs/server-only.ts"),
      "@": at("src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/app/**",
        "src/**/*.d.ts",
      ],
      thresholds,
    },
  },
});
