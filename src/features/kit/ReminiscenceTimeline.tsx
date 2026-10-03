import type { ReminiscenceWindow } from "@/domain/window";
import { timelineGeometry } from "./timeline";
import styles from "./ReminiscenceTimeline.module.css";

const WIDTH = 300;
const PAD = 16;
const AXIS_Y = 44;

export interface ReminiscenceTimelineProps {
  readonly birthYear: number;
  readonly window: ReminiscenceWindow;
  /** The Person's first name, for the plain-language caption. */
  readonly personName: string;
}

/**
 * Birth year to Reminiscence Window as a drawn timeline (UX section 6, mark 5).
 * The drawing is decorative: the caption says the same thing in words, so no
 * meaning rests on the picture or its colours alone.
 */
export function ReminiscenceTimeline({ birthYear, window, personName }: ReminiscenceTimelineProps) {
  const g = timelineGeometry(birthYear, window, WIDTH, PAD);
  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        width={WIDTH}
        height="84"
        viewBox={`0 0 ${WIDTH} 84`}
        aria-hidden="true"
        focusable="false"
      >
        <line x1={PAD} x2={g.axisEnd} y1={AXIS_Y} y2={AXIS_Y} className={styles.axis} />
        <rect
          x={g.windowStartX}
          y={AXIS_Y - 14}
          width={g.windowEndX - g.windowStartX}
          height="28"
          rx="4"
          className={styles.band}
        />
        <circle cx={g.birthX} cy={AXIS_Y} r="5" className={styles.birth} />
        <text x={g.windowStartX} y={AXIS_Y - 22} className={styles.bandLabel}>
          Reminiscence Window
        </text>
        <text x={g.birthX} y="74" textAnchor="start" className={styles.year}>
          {birthYear}
        </text>
        <text x={g.windowStartX} y="74" textAnchor="middle" className={styles.yearStrong}>
          {window.start}
        </text>
        <text x={g.windowEndX} y="74" textAnchor="middle" className={styles.yearStrong}>
          {window.end}
        </text>
      </svg>
      <figcaption className={styles.caption}>
        {personName} was about 10 to 30 years old from {window.label}. Film, TV and book Cues are drawn
        from those years.
      </figcaption>
    </figure>
  );
}
