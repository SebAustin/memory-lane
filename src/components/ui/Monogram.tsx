import type { Domain } from "@/contracts";
import { initialsOf, toneOf } from "@/lib/monogram";
import styles from "./Monogram.module.css";

export const MONOGRAM_WIDTH = 320;
export const MONOGRAM_HEIGHT = 240;

/** Per-domain decoration, drawn behind the initials. Flat shapes only: no gradients, no ids. */
function Motif({ domain }: { domain: Domain }) {
  switch (domain) {
    case "music":
      return (
        <g className={styles.motif}>
          {[98, 80, 62, 44].map((r) => (
            <circle key={r} cx="238" cy="120" r={r} className={styles.line} />
          ))}
          <circle cx="238" cy="120" r="22" className={styles.mid} />
          <circle cx="238" cy="120" r="4" className={styles.bg} />
        </g>
      );
    case "film":
    case "tv":
      return (
        <g className={styles.motif}>
          {[14, 48, 82, 116, 150, 184].flatMap((y) => [
            <rect key={`l${y}`} x="12" y={y + 8} width="14" height="20" rx="3" className={styles.mid} />,
            <rect key={`r${y}`} x="294" y={y + 8} width="14" height="20" rx="3" className={styles.mid} />,
          ])}
          <rect x="40" y="20" width="240" height="200" rx="4" className={styles.line} />
        </g>
      );
    case "book":
      return (
        <g className={styles.motif}>
          {[48, 78, 108, 138, 168, 198].map((y, i) => (
            <rect key={y} x="44" y={y} width={232 - (i % 3) * 36} height="8" rx="4" className={styles.mid} />
          ))}
        </g>
      );
    case "place":
    case "brand":
      return (
        <g className={styles.motif}>
          {[70, 110, 150, 190].map((r) => (
            <circle key={r} cx="304" cy="232" r={r} className={styles.line} />
          ))}
          <circle cx="304" cy="232" r="14" className={styles.mid} />
        </g>
      );
  }
}

/**
 * The designed stand-in for a Cue photograph (no Qloo images exist yet, and
 * images off the allow-list are dropped): initials on a warm, deterministic
 * tone, with a motif for the domain. Pure inline SVG, so it is CSP-safe and
 * has explicit dimensions (NFR-9). Decorative: the Cue name is always beside it.
 */
export function Monogram({ name, domain }: { name: string; domain: Domain }) {
  const initialsX = domain === "music" ? 124 : MONOGRAM_WIDTH / 2;
  return (
    <svg
      className={styles.monogram}
      data-cue-image="monogram"
      data-tone={toneOf(name)}
      width={MONOGRAM_WIDTH}
      height={MONOGRAM_HEIGHT}
      viewBox={`0 0 ${MONOGRAM_WIDTH} ${MONOGRAM_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={MONOGRAM_WIDTH} height={MONOGRAM_HEIGHT} className={styles.bg} />
      <Motif domain={domain} />
      <text x={initialsX} y="132" textAnchor="middle" dominantBaseline="middle" className={styles.initials}>
        {initialsOf(name)}
      </text>
    </svg>
  );
}
