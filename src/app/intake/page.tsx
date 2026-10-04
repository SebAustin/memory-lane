import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteChrome } from "@/components/site/SiteChrome";
import { IntakeWizard } from "@/features/intake/IntakeWizard";

export const metadata: Metadata = { title: "Start a Life Story" };

/**
 * `/intake?step=1..6` (PLAN section 3.6): the six-step Life Story wizard. The
 * draft lives in the browser (ADR 0001), so everything interesting happens in
 * the client component; this page only gives it the site chrome.
 */
export default function StartLifeStoryPage() {
  return (
    <SiteChrome>
      <Suspense>
        <IntakeWizard />
      </Suspense>
    </SiteChrome>
  );
}
