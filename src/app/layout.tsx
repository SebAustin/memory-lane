import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import "./globals.css";

/*
 * Two families only (NFR-9), Latin subset, `display: swap`. next/font downloads
 * them at build time and serves them from our own origin, so the CSP stays
 * `font-src 'self'` and no request goes to Google at runtime.
 * Fraunces carries the display voice (soft optical-size serif); Atkinson
 * Hyperlegible Next carries everything a Caregiver has to read quickly.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Memory Lane: reminiscence Sessions from what people of their era loved",
    template: "%s | Memory Lane",
  },
  description:
    "A week of reminiscence Sessions for someone living with dementia, built from the songs, films and places that people of their era and favorites tend to love.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1713" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The CSP nonce from src/proxy.ts only exists per request, so every page
  // must render dynamically (Next CSP guide). Static prerendering would ship
  // scripts without a nonce, which 'strict-dynamic' then blocks.
  await connection();
  return (
    <html lang="en" className={`${fraunces.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
