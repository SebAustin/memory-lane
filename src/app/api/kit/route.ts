import { logEvent } from "@/lib/log";
import { createKitHandler } from "@/server/handlers/kit";
import { getKitDeps } from "@/server/deps";
import { jsonError } from "@/server/http";

/** Interim JSON endpoint (ticket 02). Ticket 15 turns this into the Kit stream. */
export async function POST(req: Request): Promise<Response> {
  let handler;
  try {
    handler = createKitHandler(getKitDeps());
  } catch (error) {
    // A bad environment (ConfigError) must answer as JSON, never as a bare 500 page.
    logEvent({
      event: "kit.config_error",
      level: "error",
      error: error instanceof Error ? error.name : "unknown",
    });
    return jsonError(500, "server_misconfigured", "The server is not set up correctly.");
  }
  return handler(req);
}
