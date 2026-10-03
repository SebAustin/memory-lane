import type { ReminiscenceWindow } from "@/domain/window";

export interface TimelineGeometry {
  readonly birthX: number;
  readonly windowStartX: number;
  readonly windowEndX: number;
  readonly axisEnd: number;
}

/** Years shown after the Window closes, so the band does not touch the edge. */
const TAIL_YEARS = 10;

/**
 * Horizontal positions for the Reminiscence timeline: the axis runs from the
 * birth year to ten years after the Window ends, scaled into `width` minus padding.
 */
export function timelineGeometry(
  birthYear: number,
  window: ReminiscenceWindow,
  width: number,
  pad: number,
): TimelineGeometry {
  const lastYear = window.end + TAIL_YEARS;
  const unit = (width - 2 * pad) / (lastYear - birthYear);
  const x = (year: number) => pad + (year - birthYear) * unit;
  return {
    birthX: x(birthYear),
    windowStartX: x(window.start),
    windowEndX: x(window.end),
    axisEnd: width - pad,
  };
}
