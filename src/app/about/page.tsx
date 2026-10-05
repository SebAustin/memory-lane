import type { Metadata } from "next";
import { SiteChrome } from "@/components/site/SiteChrome";
import { About } from "@/features/about/About";

export const metadata: Metadata = { title: "How it works and your data" };

/** `/about` (PLAN section 3.6): how it works, the evidence, Qloo, limits, and `#privacy` = Your data. */
export default function AboutPage() {
  return (
    <SiteChrome>
      <About />
    </SiteChrome>
  );
}
