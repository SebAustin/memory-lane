// Vitest alias for `server-only`. The real package throws when imported
// outside a React Server environment; tests run in plain Node, so it is
// replaced by this empty module (see vitest.config.ts).
export {};
