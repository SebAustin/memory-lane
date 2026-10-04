import "server-only";
import { logEvent } from "@/lib/log";
import { jsonError } from "@/server/http";

export type RouteHandler = (req: Request) => Promise<Response>;

/**
 * Wraps a handler factory for a route file. A bad environment (`ConfigError`
 * from `getDeps`) must answer as JSON, never as a bare 500 page, and must log
 * only the error's name (never a value).
 */
export function routeFor<D>(
  name: string,
  getDeps: () => D,
  createHandler: (deps: D) => RouteHandler,
): RouteHandler {
  return async (req) => {
    let handler: RouteHandler;
    try {
      handler = createHandler(getDeps());
    } catch (error) {
      logEvent({
        event: `${name}.config_error`,
        level: "error",
        error: error instanceof Error ? error.name : "unknown",
      });
      return jsonError(500, "server_misconfigured", "The server is not set up correctly.");
    }
    return handler(req);
  };
}
