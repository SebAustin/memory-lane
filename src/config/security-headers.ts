/**
 * Security headers and CSP for `src/proxy.ts` (PLAN section 7, NFR-16).
 * Pure functions with no Next or server-only imports, so they run in any runtime.
 */
const NONCE_BYTES = 16;

export interface HeaderOptions {
  readonly nonce: string;
  readonly imageHosts: readonly string[];
  /** Dev needs `'unsafe-eval'` for React's debugging stacks; production never does. */
  readonly isDevelopment: boolean;
  /**
   * `upgrade-insecure-requests` (default true). Only plain-http loopback
   * requests turn it off: WebKit would otherwise upgrade every subresource of
   * `http://localhost` to https and fail, so local WebKit runs (and the iPad
   * E2E project) get no styles or scripts. Real deployments are https-only.
   */
  readonly upgradeInsecure?: boolean;
}

/** A fresh 128-bit, base64 nonce. Must be unique per request. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  return btoa(String.fromCharCode(...bytes));
}

export function buildCsp({
  nonce,
  imageHosts,
  isDevelopment,
  upgradeInsecure = true,
}: HeaderOptions): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDevelopment) scriptSrc.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", "data:", "blob:", ...imageHosts].join(" ")}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(upgradeInsecure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

/** Every header sent on every response, CSP included. */
export function buildSecurityHeaders(options: HeaderOptions): Readonly<Record<string, string>> {
  return {
    "Content-Security-Policy": buildCsp(options),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": PERMISSIONS_POLICY,
  };
}
