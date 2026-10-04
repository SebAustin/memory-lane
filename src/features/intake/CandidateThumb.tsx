import type { SeedCandidate } from "@/contracts";
import { MONOGRAM_HEIGHT, MONOGRAM_WIDTH, Monogram } from "@/components/ui/Monogram";
import styles from "./Candidate.module.css";

/**
 * The picture for a candidate: Qloo's photo when it is on an allowed host,
 * otherwise a designed monogram. Decorative: the name is always beside it.
 */
export function CandidateThumb({ candidate }: { candidate: Pick<SeedCandidate, "name" | "domain" | "imageUrl"> }) {
  return (
    <span className={styles.thumb}>
      {candidate.imageUrl === null ? (
        <Monogram name={candidate.name} domain={candidate.domain} />
      ) : (
        // Plain <img> on purpose (PLAN section 2: no image optimizer on Hobby; hosts are allow-listed).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={candidate.imageUrl}
          width={MONOGRAM_WIDTH}
          height={MONOGRAM_HEIGHT}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
}
