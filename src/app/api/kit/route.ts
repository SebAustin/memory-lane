import { createKitHandler } from "@/server/handlers/kit";
import { getKitDeps } from "@/server/deps";

/** Interim JSON endpoint (ticket 02). Ticket 15 turns this into the Kit stream. */
export async function POST(req: Request): Promise<Response> {
  return createKitHandler(getKitDeps())(req);
}
