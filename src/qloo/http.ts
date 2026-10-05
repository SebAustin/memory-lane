import "server-only";
import { backoffDelay, DEFAULT_RETRY, parseRetryAfter, type RetryPolicy } from "./backoff";
import { cacheKey, canonicalQuery, type WireQuery } from "./cacheKey";
import { createDeduper, createTieredCache, freshness, type CacheKind, type Deduper, type KvCache } from "./cache";
import { logEvent, type Logger } from "@/lib/log";
import { validateInsightsParams } from "./params";
import type {
  CallOpts,
  Envelope,
  ErrorCode,
  InsightsParams,
  InsightsResult,
  QlooClient,
  QlooEntity,
  QlooTag,
  SearchQuery,
  TagQuery,
} from "./types";
import {
  INSIGHTS_ENDPOINT,
  insightsQuery,
  interpretInsights,
  interpretSearch,
  interpretTags,
  searchQuery,
  SEARCH_ENDPOINT,
  tagsQuery,
  TAGS_ENDPOINT,
  type Interpreted,
} from "./wire";

/** Seam 3. Waits `ms`; may end early when `signal` aborts. */
export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

export const realSleep: Sleep = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

export interface HttpQlooOptions {
  /** `https://hackathon.api.qloo.com`: hackathon keys work only on this host. */
  readonly baseUrl: string;
  /** Sent as the `X-Api-Key` header, never in a URL. */
  readonly apiKey: string;
  /** Seam 2: the only network access in this module. */
  readonly fetch: typeof fetch;
  readonly cache?: KvCache;
  readonly dedupe?: Deduper;
  readonly retry?: RetryPolicy;
  readonly sleep?: Sleep;
  readonly random?: () => number;
  /** Seam 10: the clock, in epoch ms. */
  readonly now?: () => number;
  /** Image hosts Cues may use (`QLOO_IMAGE_HOSTS`); others become monograms. */
  readonly imageHosts?: readonly string[];
  readonly log?: Logger;
}

/** What one call needs besides its parameters. */
interface CallSpec<T> {
  readonly kind: CacheKind;
  readonly endpoint: string;
  readonly query: WireQuery;
  readonly interpret: (body: unknown) => Interpreted<T> | undefined;
  /** What a 403 means here: an unsupported entity type for insights, a key problem elsewhere. */
  readonly forbidden: ErrorCode;
}

type Outcome =
  | { readonly kind: "response"; readonly status: number; readonly retryAfter: number | undefined; readonly body?: unknown; readonly unreadable?: boolean }
  | { readonly kind: "timeout" }
  | { readonly kind: "aborted" }
  | { readonly kind: "network" };

type Attempt<T> =
  | { readonly ok: true; readonly result: Interpreted<T>; readonly retries: number }
  | { readonly ok: false; readonly code: ErrorCode; readonly retries: number };

const RETRYABLE_STATUS = (status: number): boolean => status === 429 || status >= 500;

const abortedRace = (signal: AbortSignal | undefined): Promise<never> | undefined =>
  signal === undefined
    ? undefined
    : new Promise((_, reject) => {
        if (signal.aborted) reject(new DOMException("aborted", "AbortError"));
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });

/**
 * The live Qloo adapter (ADR 0002, PLAN 3.1). It never throws: every outcome
 * is an Envelope. Transient trouble (429, 5xx, timeouts) is retried with
 * jittered backoff; a two-tier cache answers repeated asks and, when Qloo
 * fails, serves a stale answer marked `degraded`; a per-run budget stops it
 * before the agent's reserve is spent.
 */
export class HttpQlooClient implements QlooClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache: KvCache;
  private readonly dedupe: Deduper;
  private readonly retry: RetryPolicy;
  private readonly sleep: Sleep;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly imageHosts: readonly string[];
  private readonly log: Logger;

  constructor(options: HttpQlooOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch;
    this.cache = options.cache ?? createTieredCache({ lruMax: 500 });
    this.dedupe = options.dedupe ?? createDeduper();
    this.retry = options.retry ?? DEFAULT_RETRY;
    this.sleep = options.sleep ?? realSleep;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.imageHosts = options.imageHosts ?? [];
    this.log = options.log ?? logEvent;
  }

  search(query: SearchQuery, opts?: CallOpts): Promise<Envelope<readonly QlooEntity[]>> {
    return this.call(
      {
        kind: "search",
        endpoint: SEARCH_ENDPOINT,
        query: searchQuery(query),
        interpret: (body) => interpretSearch(body, this.imageHosts),
        forbidden: "auth",
      },
      opts,
    );
  }

  tags(query: TagQuery, opts?: CallOpts): Promise<Envelope<readonly QlooTag[]>> {
    return this.call(
      {
        kind: "tags",
        endpoint: TAGS_ENDPOINT,
        query: tagsQuery(query),
        interpret: interpretTags,
        forbidden: "auth",
      },
      opts,
    );
  }

  insights(params: InsightsParams, opts?: CallOpts): Promise<Envelope<InsightsResult>> {
    const problem = validateInsightsParams(params);
    if (problem !== undefined) {
      return Promise.resolve(this.failure(INSIGHTS_ENDPOINT, "bad_param", { paramsKey: "", retries: 0, ms: 0 }, problem));
    }
    return this.call(
      {
        kind: "insights",
        endpoint: INSIGHTS_ENDPOINT,
        query: insightsQuery(params),
        interpret: (body) => interpretInsights(body, params.filterType === "urn:tag", this.imageHosts),
        forbidden: "unsupported_type",
      },
      opts,
    );
  }

  private async call<T>(spec: CallSpec<T>, opts: CallOpts = {}): Promise<Envelope<T>> {
    const startedAt = this.now();
    let envelope: Envelope<T>;
    try {
      envelope = await this.run(spec, opts, startedAt);
    } catch {
      // Defensive: nothing above should throw, but the contract is "never".
      envelope = this.failure(spec.endpoint, "upstream", { paramsKey: "", retries: 0, ms: this.now() - startedAt });
    }
    this.log({
      event: "qloo.call",
      level: envelope.status === "error" ? "warn" : "info",
      endpoint: spec.endpoint,
      status: envelope.status,
      errorCode: envelope.errorCode,
      cached: envelope.provenance.cached,
      stale: envelope.provenance.stale,
      retries: envelope.provenance.retries,
      ms: envelope.provenance.ms,
    });
    return envelope;
  }

  private async run<T>(spec: CallSpec<T>, opts: CallOpts, startedAt: number): Promise<Envelope<T>> {
    const key = cacheKey(spec.endpoint, spec.query);
    const meta = (extra: { cached?: boolean; stale?: boolean; retries?: number } = {}) => ({
      paramsKey: key,
      retries: 0,
      ...extra,
      ms: this.now() - startedAt,
    });
    if (opts.signal?.aborted) return this.failure(spec.endpoint, "aborted", meta());

    const record = await this.cache.get(key).catch(() => undefined);
    const state = record === undefined ? "expired" : freshness(spec.kind, record, this.now());
    const cached = state === "expired" ? undefined : spec.interpret(record?.value);
    if (state === "fresh" && cached !== undefined) {
      return this.success(spec.endpoint, cached, meta({ cached: true }));
    }

    if (opts.budget !== undefined && !opts.budget.take(opts.budgetKind ?? "prefetch")) {
      return this.failure(spec.endpoint, "budget", meta(), "Qloo call budget reached");
    }

    const attempt = await this.dedupe(key, (flight) => this.fetchAndStore(spec, key, flight), opts.signal).catch(
      (error: unknown): Attempt<T> => ({
        ok: false,
        code: error instanceof DOMException && error.name === "AbortError" ? "aborted" : "upstream",
        retries: 0,
      }),
    );

    if (attempt.ok) return this.success(spec.endpoint, attempt.result, meta({ retries: attempt.retries }));
    if (attempt.code !== "aborted" && cached !== undefined) {
      const stale = this.success(spec.endpoint, cached, meta({ cached: true, stale: true, retries: attempt.retries }));
      return { ...stale, status: "degraded" };
    }
    return this.failure(spec.endpoint, attempt.code, meta({ retries: attempt.retries }));
  }

  /** The network half: fetch with retries, then remember a good answer. */
  private async fetchAndStore<T>(spec: CallSpec<T>, key: string, flight: AbortSignal): Promise<Attempt<T>> {
    const attempt = await this.fetchWithRetries(spec, flight);
    if (attempt.ok) {
      // `attempt.body` was just interpreted; store what Qloo said, not our reading of it.
      await this.cache.set(key, { value: attempt.body, storedAt: this.now() }).catch(() => undefined);
    }
    return attempt.ok ? { ok: true, result: attempt.result, retries: attempt.retries } : attempt;
  }

  private async fetchWithRetries<T>(
    spec: CallSpec<T>,
    flight: AbortSignal,
  ): Promise<Attempt<T> & { readonly body?: unknown }> {
    const url = `${this.baseUrl}${spec.endpoint}?${canonicalQuery(spec.query)}`;
    for (let retries = 0; ; retries += 1) {
      const outcome = await this.once(url, flight);
      if (outcome.kind === "aborted") return { ok: false, code: "aborted", retries };

      const retryable = outcome.kind === "timeout" || (outcome.kind === "response" && RETRYABLE_STATUS(outcome.status));
      if (!retryable) return { ...this.settle(spec, outcome), retries };
      if (retries >= this.retry.maxRetries) return { ok: false, code: failureCode(outcome), retries };

      const retryAfter = outcome.kind === "response" ? outcome.retryAfter : undefined;
      const waited = await this.wait(backoffDelay(retries, this.retry, this.random, retryAfter), flight);
      if (!waited) return { ok: false, code: "aborted", retries };
    }
  }

  /** Waits out a backoff; false when `signal` aborts first (it ends the wait, and so the call). */
  private async wait(ms: number, signal: AbortSignal): Promise<boolean> {
    const aborted = abortedRace(signal);
    try {
      await Promise.race([this.sleep(ms, signal), ...(aborted ? [aborted] : [])]);
      return !signal.aborted;
    } catch {
      return false;
    }
  }

  /** One request, bounded by the per-attempt timeout and the caller's signal. */
  private async once(url: string, flight: AbortSignal): Promise<Outcome> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.retry.attemptTimeoutMs);
    const onAbort = () => controller.abort();
    flight.addEventListener("abort", onAbort, { once: true });
    if (flight.aborted) controller.abort();

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: { "X-Api-Key": this.apiKey, Accept: "application/json" },
        // A redirect would carry the key to another host.
        redirect: "error",
        signal: controller.signal,
      });
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"), this.now());
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return { kind: "response", status: response.status, retryAfter };
      }
      try {
        return { kind: "response", status: response.status, retryAfter, body: await response.json() };
      } catch {
        if (flight.aborted) return { kind: "aborted" };
        return timedOut ? { kind: "timeout" } : { kind: "response", status: response.status, retryAfter, unreadable: true };
      }
    } catch {
      if (flight.aborted) return { kind: "aborted" };
      return timedOut ? { kind: "timeout" } : { kind: "network" };
    } finally {
      clearTimeout(timer);
      flight.removeEventListener("abort", onAbort);
    }
  }

  /** A response that is not worth retrying: a success to check, or an error to name. */
  private settle<T>(spec: CallSpec<T>, outcome: Outcome): Attempt<T> & { readonly body?: unknown } {
    if (outcome.kind !== "response") return { ok: false, code: "upstream", retries: 0 };
    const { status } = outcome;
    if (status >= 200 && status < 300) {
      const result = outcome.unreadable ? undefined : spec.interpret(outcome.body);
      return result === undefined
        ? { ok: false, code: "schema", retries: 0 }
        : { ok: true, result, body: outcome.body, retries: 0 };
    }
    const code: Record<number, ErrorCode> = {
      400: "bad_param",
      401: "auth",
      403: spec.forbidden,
      404: "bad_param",
      422: "bad_param",
    };
    return { ok: false, code: code[status] ?? "upstream", retries: 0 };
  }

  private success<T>(endpoint: string, result: Interpreted<T>, meta: Meta): Envelope<T> {
    return { status: result.status, data: result.data, provenance: provenance(endpoint, meta) };
  }

  private failure<T>(endpoint: string, errorCode: ErrorCode, meta: Meta, hint?: string): Envelope<T> {
    return {
      status: "error",
      data: null,
      provenance: provenance(endpoint, meta),
      errorCode,
      ...(hint === undefined ? {} : { hint }),
    };
  }
}

interface Meta {
  readonly paramsKey: string;
  readonly retries: number;
  readonly ms: number;
  readonly cached?: boolean;
  readonly stale?: boolean;
}

const provenance = (endpoint: string, meta: Meta) => ({
  endpoint,
  paramsKey: meta.paramsKey,
  cached: meta.cached ?? false,
  stale: meta.stale ?? false,
  retries: meta.retries,
  ms: meta.ms,
});

/** The error to report once retries are spent. */
function failureCode(outcome: Outcome): ErrorCode {
  if (outcome.kind === "timeout") return "timeout";
  if (outcome.kind === "response" && outcome.status === 429) return "rate_limited";
  return "upstream";
}
