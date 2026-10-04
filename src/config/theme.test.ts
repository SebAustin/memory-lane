import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { oklchToHex } from "@/lib/oklch";
import { THEME_COLOR } from "./theme";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** The first `--paper-50: oklch(...)` declaration at or after `marker`. */
function paper50(marker: string): [number, number, number] {
  const block = css.slice(css.indexOf(marker));
  const match = /--paper-50:\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(block);
  if (!match) throw new Error(`--paper-50 not found after ${marker}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe("THEME_COLOR mirrors the --paper-50 tokens", () => {
  it("matches the light token", () => {
    expect(THEME_COLOR.light).toBe(oklchToHex(...paper50(':root,\n[data-theme="light"]')));
  });

  it("matches the dark token", () => {
    expect(THEME_COLOR.dark).toBe(oklchToHex(...paper50('[data-theme="dark"] {')));
  });
});

describe("oklchToHex", () => {
  it("maps white and black", () => {
    expect(oklchToHex(100, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
  });

  it("clamps out-of-gamut colours instead of overflowing", () => {
    expect(oklchToHex(70, 0.4, 145)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
