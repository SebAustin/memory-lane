/**
 * Parses `QLOO_IMAGE_HOSTS` into CSP-safe host sources. Pure and free of
 * server-only imports so `src/proxy.ts` can share it with env parsing.
 *
 * Only bare hostnames (optionally `*.` wildcard) are accepted. Anything else,
 * including whitespace, `;`, quotes or schemes, could inject extra CSP
 * directives, so it is reported as invalid instead of being passed through.
 */
const HOST_PATTERN =
  /^(\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export interface ImageHosts {
  /** Valid hosts, lower-cased (hostnames are case-insensitive), in the order given, each once. */
  readonly hosts: readonly string[];
  readonly invalid: readonly string[];
  /** Hosts listed more than once once case is folded: almost always a config typo. */
  readonly duplicates: readonly string[];
}

export function parseImageHosts(raw: string | undefined): ImageHosts {
  const entries = (raw ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h !== "");

  const valid = entries.filter((h) => HOST_PATTERN.test(h));
  const unique = [...new Set(valid)];
  return {
    hosts: unique,
    invalid: entries.filter((h) => !HOST_PATTERN.test(h)),
    duplicates: unique.filter((host) => valid.indexOf(host) !== valid.lastIndexOf(host)),
  };
}
