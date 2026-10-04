import "server-only";

/**
 * Server-side entry for the validated configuration. The logic lives in
 * `src/config/server-config.ts`, which has no `server-only` import so that
 * `next.config.ts` can run the same validation at build time (a bad
 * environment then fails the build or deploy, not the first request).
 */
export * from "@/config/server-config";
