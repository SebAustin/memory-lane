/**
 * PROTOTYPE, throwaway. Sub-shape B of the prototype skill (UI branch): a new route because Session Mode
 * has no real page yet.
 *
 * Question: "What should Session Mode look like?" (the screen a Caregiver runs on a tablet beside the Person).
 * Three structurally different variants of the Session Mode route, switchable via `?variant=A|B|C`
 * on /prototype/session-mode, with the floating bottom switcher (dev only).
 *
 *   A  Turn the Page   scrapbook spread, stamp Reactions, page-turn advance
 *   B  The Window      edge-to-edge picture, big caption, Reaction rail above the bar
 *   C  Run of Show     Caregiver console with running order and "Show to the Person"
 *
 * In-memory state only. No persistence, no tests. When a variant wins: fold it into
 * `/p/[storyId]/session/[n]`, keep this folder only on a throwaway branch.
 */

import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import "./prototype.css";
import { PrototypeSwitcher } from "./PrototypeSwitcher";
import { SessionProvider } from "./SessionContext";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";
import { parseVariant } from "./variants";

// Fonts are scoped to this route: the CSS variables are only defined on the .pm-root element below.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PROTOTYPE: Session Mode",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ variant?: string | string[] }>;
}

export default async function SessionModePrototypePage({ searchParams }: Props) {
  const { variant: rawVariant } = await searchParams;
  const variant = parseVariant(rawVariant);

  return (
    <div
      className={`pm-root ${fraunces.variable} ${atkinson.variable}`}
      data-surface="session"
      data-tone={variant === "B" ? "dark" : "light"}
    >
      <SessionProvider>
        {variant === "A" && <VariantA />}
        {variant === "B" && <VariantB />}
        {variant === "C" && <VariantC />}
        <PrototypeSwitcher current={variant} />
      </SessionProvider>
    </div>
  );
}
