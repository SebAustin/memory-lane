import type { Page } from "@playwright/test";

interface CspViolation {
  readonly directive: string;
  readonly blocked: string;
}

declare global {
  interface Window {
    __csp?: CspViolation[];
  }
}

/**
 * Records every `securitypolicyviolation` DOM event from before the page's own
 * scripts run. This is the one detector that works in all three engines:
 * matching console text misses Firefox, which words (or omits) the message differently.
 * Call before `page.goto`; read with {@link cspViolations} after each navigation,
 * because every new document starts with an empty list.
 */
export async function watchCsp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__csp?.push({ directive: event.violatedDirective, blocked: event.blockedURI });
    });
  });
}

export function cspViolations(page: Page): Promise<CspViolation[]> {
  return page.evaluate(() => window.__csp ?? []);
}
