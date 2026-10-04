import "server-only";
import {
  EntityResolveResponse,
  ResolveRequest,
  TagResolveResponse,
} from "@/contracts";
import { resolveSeed, resolveTag } from "@/qloo/resolve";
import type { Envelope, QlooClient } from "@/qloo/types";
import { jsonError, parseJson } from "@/server/http";
import type { RateLimiter } from "@/server/rateLimit";
import { startRequest, type RequestLogDeps } from "@/server/requestLog";

/**
 * `POST /api/resolve` (PLAN 3.4): turns typed text into confirmed Qloo
 * entities or tags. A handler factory (seam 8), so tests call it without a
 * server. Order matters: the rate limit comes first, so junk costs a token.
 */

/** A body is `{kind, query, domain?}`; 1 KB is generous even for an 80-character query in any script. */
const MAX_BODY_BYTES = 1024;

export interface ResolveHandlerDeps extends RequestLogDeps {
  readonly client: QlooClient;
  readonly limiter: RateLimiter;
  /** Rate-limit key for a caller (`clientKey`). */
  readonly clientKey: (req: Request) => string;
}

/** The public shape of an envelope: status and data, plus hint and error code only when present. */
function publicEnvelope<T>(envelope: Envelope<readonly T[]>) {
  return {
    status: envelope.status,
    data: envelope.data === null ? null : [...envelope.data],
    ...(envelope.hint === undefined ? {} : { hint: envelope.hint }),
    ...(envelope.errorCode === undefined ? {} : { errorCode: envelope.errorCode }),
  };
}

export function createResolveHandler(deps: ResolveHandlerDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    const request = startRequest("resolve", deps);

    const verdict = deps.limiter(deps.clientKey(req));
    if (!verdict.ok) {
      return request.done(
        jsonError(429, "rate_limited", "That was a lot of searches at once. Wait a moment, then try again.", {
          "Retry-After": String(verdict.retryAfterSec),
        }),
      );
    }

    const body = await parseJson(req, ResolveRequest, MAX_BODY_BYTES);
    if (body instanceof Response) return request.done(body);

    try {
      const answer =
        body.kind === "entity"
          ? EntityResolveResponse.safeParse(
              publicEnvelope(await resolveSeed(deps.client, { query: body.query, domain: body.domain })),
            )
          : TagResolveResponse.safeParse(publicEnvelope(await resolveTag(deps.client, { query: body.query })));
      if (!answer.success) throw new TypeError("resolve response failed its own contract");
      return request.done(Response.json(answer.data), { kind: body.kind, outcome: answer.data.status });
    } catch (error) {
      // Qloo trouble arrives as an error envelope, so anything thrown here is our own bug.
      return request.done(
        jsonError(500, "internal_error", "We couldn't look that up this time."),
        { error: error instanceof Error ? error.name : "unknown" },
      );
    }
  };
}
