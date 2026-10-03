import { describe, expect, it } from "vitest";
import { reminiscenceWindow } from "@/domain/window";
import { timelineGeometry } from "@/features/kit/timeline";

const WIDTH = 300;
const PAD = 16;

describe("timelineGeometry", () => {
  const geometry = timelineGeometry(1946, reminiscenceWindow(1946), WIDTH, PAD);

  it("starts the axis at the birth year, inside the padding", () => {
    expect(geometry.birthX).toBe(PAD);
    expect(geometry.axisEnd).toBe(WIDTH - PAD);
  });

  it("places the Window band proportionally between birth and ten years after it ends", () => {
    // Domain 1946..1986 spans 40 years; the Window is 1956..1976.
    const unit = (WIDTH - 2 * PAD) / 40;
    expect(geometry.windowStartX).toBeCloseTo(PAD + 10 * unit);
    expect(geometry.windowEndX).toBeCloseTo(PAD + 30 * unit);
  });

  it("keeps everything inside the drawing for the earliest and latest birth years", () => {
    for (const year of [1920, 1975]) {
      const g = timelineGeometry(year, reminiscenceWindow(year), WIDTH, PAD);
      expect(g.birthX).toBeGreaterThanOrEqual(PAD);
      expect(g.windowStartX).toBeGreaterThan(g.birthX);
      expect(g.windowEndX).toBeGreaterThan(g.windowStartX);
      expect(g.windowEndX).toBeLessThan(g.axisEnd);
    }
  });
});
