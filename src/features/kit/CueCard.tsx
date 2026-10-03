import { useId, type CSSProperties } from "react";
import type { Cue } from "@/contracts";
import { DomainGlyph } from "@/components/ui/DomainGlyph";
import { DOMAIN_LABEL } from "@/components/ui/domain";
import { MONOGRAM_HEIGHT, MONOGRAM_WIDTH, Monogram } from "@/components/ui/Monogram";
import { fillName } from "@/lib/text";
import { cardRhythm, type Tilt } from "./rhythm";
import styles from "./CueCard.module.css";

export interface CueCardProps {
  readonly cue: Cue;
  /** The Person's first name, used only to fill `{name}` in the generated text. */
  readonly personName: string;
  /** Position in the grid: drives tilt, tape and the staggered entrance. */
  readonly index: number;
  /** Load the picture eagerly (hero media only). Everything else is lazy. */
  readonly eager?: boolean;
  readonly tilt?: Tilt;
}

/**
 * A Cue as a mounted photograph (UX 4.4). An `article` carrying the Qloo
 * `data-entity-id`, so "every rendered Cue has an entity id" is checkable (SC-1).
 */
export function CueCard({ cue, personName, index, eager = false, tilt }: CueCardProps) {
  const headingId = useId();
  const rhythm = cardRhythm(index);
  return (
    <article
      className={styles.card}
      data-entity-id={cue.entityId}
      data-domain={cue.domain}
      data-tilt={tilt ?? rhythm.tilt}
      data-taped={rhythm.taped}
      data-featured={rhythm.featured}
      aria-labelledby={headingId}
      style={{ "--enter": index } as CSSProperties}
    >
      <div className={styles.photo}>
        {cue.imageUrl === null ? (
          <Monogram name={cue.name} domain={cue.domain} />
        ) : (
          // Plain <img> on purpose (PLAN section 2: no image optimizer on Hobby; hosts are allow-listed).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.image}
            data-cue-image="photo"
            src={cue.imageUrl}
            width={MONOGRAM_WIDTH}
            height={MONOGRAM_HEIGHT}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "auto"}
          />
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.meta}>
          <DomainGlyph domain={cue.domain} className={styles.glyph} />
          <span>{DOMAIN_LABEL[cue.domain]}</span>
          {cue.year !== undefined && <span className={styles.year}>{cue.year}</span>}
        </p>
        <h3 id={headingId} className={styles.name}>
          {cue.name}
        </h3>
        <p className={styles.why}>{fillName(cue.whyThis, personName)}</p>
        {cue.tags.length > 0 && (
          <ul className={styles.tags} aria-label="Tags">
            {cue.tags.map((tag) => (
              <li key={tag.id}>{tag.name}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
