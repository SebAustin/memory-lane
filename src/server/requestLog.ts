import "server-only";
import { randomUUID } from "node:crypto";
import { logEvent, type Logger } from "@/lib/log";

/**
 * One JSON line per request (PLAN 9): the route, status, duration and a
 * request id. It never carries a body, a typed name or an address; callers add
 * only counts, ids and codes through `fields`.
 */

export interface RequestLogDeps {
  readonly log?: Logger;
  /** Clock in ms (seam 10). */
  readonly now?: () => number;
  readonly newId?: () => string;
}

export interface RequestLog {
  readonly reqId: string;
  /** Logs the request and stamps `x-request-id` on the response. */
  done(
    response: Response,
    fields?: Readonly<Record<string, string | number | boolean | undefined>>,
  ): Response;
}

export function startRequest(
  route: string,
  { log = logEvent, now = Date.now, newId = randomUUID }: RequestLogDeps = {},
): RequestLog {
  const started = now();
  const reqId = newId();
  return {
    reqId,
    done(response, fields = {}) {
      response.headers.set("x-request-id", reqId);
      log({
        event: "request",
        level: response.status >= 500 ? "error" : "info",
        route,
        status: response.status,
        ms: now() - started,
        reqId,
        ...fields,
      });
      return response;
    },
  };
}
