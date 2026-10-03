import { NextResponse, type NextRequest } from "next/server";
import { parseImageHosts } from "@/config/image-hosts";
import { buildSecurityHeaders, generateNonce } from "@/config/security-headers";

/**
 * Next 16 `proxy` (formerly middleware). Runs on every request, generates a
 * per-request CSP nonce, forwards it to rendering via the request headers
 * (Next reads the nonce from the CSP header and stamps its own scripts), and
 * sets the security headers on the response.
 *
 * Unsafe `QLOO_IMAGE_HOSTS` entries are dropped here (fail closed); the same
 * value is rejected at boot by `getServerConfig`.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const headers = buildSecurityHeaders({
    nonce,
    imageHosts: parseImageHosts(process.env.QLOO_IMAGE_HOSTS).hosts,
    isDevelopment: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
}
