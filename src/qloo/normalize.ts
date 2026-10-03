import "server-only";
import { z } from "zod";
import { Domain } from "@/contracts";
import { DOMAIN_URN, type EntityUrn, type QlooEntity, type QlooTag } from "./types";

/**
 * Boundary validation for raw Qloo entities (ADR 0002, risk R1: Qloo's shapes
 * may differ from the docs, so the schema is loose and defensive). Anything
 * that cannot be trusted degrades to a safe default; only an entity with no
 * usable id, name or type is rejected.
 */
const RawEntity = z.looseObject({
  entity_id: z.string().min(1).max(64),
  name: z.string().min(1),
  type: z.string(),
  properties: z.unknown().optional(),
  tags: z.unknown().optional(),
  query: z.unknown().optional(),
});

const URN_DOMAIN: ReadonlyMap<string, { urn: EntityUrn; domain: Domain }> = new Map(
  Object.entries(DOMAIN_URN).map(([domain, urn]) => [urn, { urn, domain: domain as Domain }]),
);

const RawTag = z.looseObject({ tag_id: z.string().min(1), name: z.string().min(1) });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when `host` equals an allow-list entry, or sits under a `*.parent` entry. */
function hostMatches(host: string, allowed: string): boolean {
  if (!allowed.startsWith("*.")) return host === allowed;
  return host.endsWith(allowed.slice(1)) && host.length > allowed.length - 1;
}

/**
 * Whether `rawUrl` is an https URL whose hostname is on the allow-list
 * (`QLOO_IMAGE_HOSTS` format: bare hosts or `*.host`). Parses the URL, never
 * pattern-matches the string, so look-alike hosts and `user@host` tricks fail.
 */
export function isAllowedImageHost(rawUrl: string, imageHosts: readonly string[]): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return false;
  const host = url.hostname.toLowerCase();
  return imageHosts.some((allowed) => hostMatches(host, allowed.toLowerCase()));
}

/** Reads `properties.image`, which may be a string or `{ url }` (docs/qloo-api.md gotchas). */
function readImage(properties: unknown): string | null {
  if (!isRecord(properties)) return null;
  const image = properties.image;
  if (typeof image === "string") return image;
  if (isRecord(image) && typeof image.url === "string") return image.url;
  return null;
}

function readTags(raw: unknown): QlooTag[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((tag) => {
    const parsed = RawTag.safeParse(tag);
    return parsed.success ? [{ id: parsed.data.tag_id, name: parsed.data.name }] : [];
  });
}

function readAffinity(query: unknown): number | null {
  if (!isRecord(query) || typeof query.affinity !== "number" || Number.isNaN(query.affinity)) {
    return null;
  }
  return Math.min(1, Math.max(0, query.affinity));
}

function readExplainability(query: unknown): Record<string, number> {
  if (!isRecord(query) || !isRecord(query.explainability)) return {};
  return Object.fromEntries(
    Object.entries(query.explainability).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && !Number.isNaN(entry[1]),
    ),
  );
}

function readYear(properties: unknown): number | undefined {
  if (!isRecord(properties)) return undefined;
  const year = properties.release_year;
  return typeof year === "number" && Number.isInteger(year) ? year : undefined;
}

/**
 * Validates and normalizes one raw Qloo entity. Returns null for anything that
 * is not a usable Cue candidate. An image on a host that is not allow-listed
 * becomes `imageUrl: null`, so the card shows the monogram fallback.
 */
export function normalizeEntity(raw: unknown, imageHosts: readonly string[]): QlooEntity | null {
  const parsed = RawEntity.safeParse(raw);
  if (!parsed.success) return null;
  const { entity_id, name, type, properties, tags, query } = parsed.data;

  const mapped = URN_DOMAIN.get(type);
  if (!mapped) return null;

  const image = readImage(properties);
  const year = readYear(properties);
  return {
    entityId: entity_id,
    name,
    type: mapped.urn,
    domain: mapped.domain,
    ...(year === undefined ? {} : { year }),
    imageUrl: image !== null && isAllowedImageHost(image, imageHosts) ? image : null,
    tags: readTags(tags),
    affinity: readAffinity(query),
    explainability: readExplainability(query),
  };
}
