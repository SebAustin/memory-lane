import {
  EntityResolveResponse,
  MAX_ENTITY_QUERY,
  MAX_TAG_QUERY,
  TagResolveResponse,
  type SeedCandidate,
  type TagCandidate,
} from "@/contracts";
import { scrubQuery } from "@/domain/digest";
import { logEvent } from "@/lib/log";

/**
 * The browser's side of `POST /api/resolve`. It scrubs the first name out of
 * the text before it leaves the device (the server never learns the name),
 * checks the answer against the shared contract, and boils every outcome down
 * to what the wizard needs to say to the Caregiver.
 */

export type EntityOutcome =
  /** One confident match: show it to confirm. */
  | { readonly kind: "match"; readonly candidate: SeedCandidate }
  /** Several or loose matches: the Caregiver chooses. Never auto-picked. */
  | { readonly kind: "choose"; readonly candidates: readonly SeedCandidate[] }
  | { readonly kind: "none"; readonly hint?: string }
  | { readonly kind: "unreachable" }
  | { readonly kind: "busy"; readonly retryAfterSec: number }
  /** Nothing left to look up once the first name was removed. */
  | { readonly kind: "invalid" };

export type TagOutcome =
  | { readonly kind: "tag"; readonly tag: TagCandidate }
  /** No confident tag: the topic only guides conversation Prompts. */
  | { readonly kind: "topic"; readonly reachedQloo: boolean };

export interface LookupContext {
  /** The Person's first name, removed from the text before it is sent. */
  readonly firstName: string;
}

export interface Resolver {
  entity(query: string, context: LookupContext): Promise<EntityOutcome>;
  tag(query: string, context: LookupContext): Promise<TagOutcome>;
}

const ENDPOINT = "/api/resolve";
const TIMEOUT_MS = 10_000;
const MIN_QUERY = 2;
const DEFAULT_RETRY_SEC = 30;

type Transport =
  | { readonly kind: "ok"; readonly json: unknown }
  | { readonly kind: "busy"; readonly retryAfterSec: number }
  | { readonly kind: "down" };

async function post(fetchImpl: typeof fetch, body: object): Promise<Transport> {
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after"));
      return { kind: "busy", retryAfterSec: Number.isFinite(wait) && wait > 0 ? Math.ceil(wait) : DEFAULT_RETRY_SEC };
    }
    if (!res.ok) return { kind: "down" };
    return { kind: "ok", json: await res.json() };
  } catch {
    return { kind: "down" };
  }
}

export function createFetchResolver(fetchImpl: typeof fetch = (...args) => fetch(...args)): Resolver {
  return {
    async entity(query, { firstName }) {
      const text = scrubQuery(query, firstName).slice(0, MAX_ENTITY_QUERY).trim();
      if (text.length < MIN_QUERY) return { kind: "invalid" };

      const transport = await post(fetchImpl, { kind: "entity", query: text });
      if (transport.kind === "busy") return transport;
      const parsed = transport.kind === "ok" ? EntityResolveResponse.safeParse(transport.json) : undefined;
      if (parsed === undefined || !parsed.success) {
        if (transport.kind === "ok") logEvent({ event: "resolve_response_invalid", level: "warn" });
        return { kind: "unreachable" };
      }

      const { status, data, hint } = parsed.data;
      if (status === "error" || data === null) return { kind: "unreachable" };
      if (data.length === 0) return { kind: "none", ...(hint === undefined ? {} : { hint }) };
      const [only] = data;
      return status === "ok" && data.length === 1 && only !== undefined
        ? { kind: "match", candidate: only }
        : { kind: "choose", candidates: data };
    },

    async tag(query, { firstName }) {
      const text = scrubQuery(query, firstName).slice(0, MAX_TAG_QUERY).trim();
      if (text.length < MIN_QUERY) return { kind: "topic", reachedQloo: false };

      const transport = await post(fetchImpl, { kind: "tag", query: text });
      const parsed = transport.kind === "ok" ? TagResolveResponse.safeParse(transport.json) : undefined;
      if (parsed === undefined || !parsed.success || parsed.data.status === "error") {
        return { kind: "topic", reachedQloo: false };
      }
      const [top] = parsed.data.data ?? [];
      return parsed.data.status === "ok" && top !== undefined
        ? { kind: "tag", tag: top }
        : { kind: "topic", reachedQloo: true };
    },
  };
}
