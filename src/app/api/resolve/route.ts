import { createResolveHandler } from "@/server/handlers/resolve";
import { getResolveDeps } from "@/server/deps";
import { routeFor } from "@/server/route";

/** `POST /api/resolve`: thin shell over the handler factory. */
export const POST = routeFor("resolve", getResolveDeps, createResolveHandler);
