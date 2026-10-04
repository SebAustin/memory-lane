import { z } from "zod";

/*
 * Zod normally probes for `eval` support with `new Function("")`. On the server
 * that is fine. In the browser our CSP (no 'unsafe-eval', PLAN section 7) blocks
 * it, and the browser reports a violation even though Zod catches the error.
 * `jitless` skips the probe and uses the plain parser, which is plenty fast for
 * a Life Story. This module must be the first thing the contracts import.
 */
if (typeof window !== "undefined") z.config({ jitless: true });

export { z };
