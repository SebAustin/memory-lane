import "server-only";
import { KitRequest } from "@/contracts";
import { logEvent } from "@/lib/log";
import { jsonError, parseJson } from "@/server/http";
import { buildInterimKit, InterimKit, type BuildInterimKitDeps } from "@/server/kit/buildInterimKit";

/**
 * INTERIM `/api/kit` handler (ticket 02): validate the request, build the
 * music Cues, check the response, answer. All Kit logic lives in
 * `buildInterimKit`; ticket 15 swaps the JSON answer for the stream.
 * A handler factory (seam 8), so tests call it without a running server.
 */

const MAX_BODY_BYTES = 16 * 1024;

export type KitHandlerDeps = BuildInterimKitDeps;

/** `POST /api/kit`: `(Request) => Response`, thin enough for the route file to wrap. */
export function createKitHandler(deps: KitHandlerDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    const request = await parseJson(req, KitRequest, MAX_BODY_BYTES);
    if (request instanceof Response) return request;
    try {
      const checked = InterimKit.safeParse(await buildInterimKit(request, deps));
      if (!checked.success) {
        logEvent({ event: "kit.response_invalid", level: "error", issues: checked.error.issues.length });
        return jsonError(500, "internal_error", "We couldn't build the Kit this time.");
      }
      return Response.json(checked.data);
    } catch (error) {
      // Qloo trouble is reported inside the result, so anything thrown here is our own bug.
      logEvent({
        event: "kit.handler_error",
        level: "error",
        error: error instanceof Error ? error.name : "unknown",
      });
      return jsonError(500, "internal_error", "We couldn't build the Kit this time.");
    }
  };
}
