import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memory Lane",
  description:
    "Reminiscence sessions for people living with dementia, grounded in what people of their era loved.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The CSP nonce from src/proxy.ts only exists per request, so every page
  // must render dynamically (Next CSP guide). Static prerendering would ship
  // scripts without a nonce, which 'strict-dynamic' then blocks.
  await connection();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
