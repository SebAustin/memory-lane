import { createKitHandler } from "@/server/handlers/kit";
import { getKitDeps } from "@/server/deps";
import { routeFor } from "@/server/route";

/** Interim JSON endpoint (ticket 02). Ticket 15 turns this into the Kit stream. */
export const POST = routeFor("kit", getKitDeps, createKitHandler);
