import type { Cue, LifeStory, Notice } from "@/contracts";
import { DomainGlyph } from "@/components/ui/DomainGlyph";
import { Container } from "@/components/ui/Container";
import { DOMAIN_LABEL } from "@/components/ui/domain";
import type { ReminiscenceWindow } from "@/domain/window";
import { CueCard } from "./CueCard";
import { ReminiscenceTimeline } from "./ReminiscenceTimeline";
import styles from "./KitView.module.css";

type AvoidItem = LifeStory["avoidList"][number];

export interface KitViewProps {
  readonly story: Pick<
    LifeStory,
    "firstName" | "birthYear" | "hometown" | "dementiaStage" | "seeds" | "avoidList"
  >;
  readonly window: ReminiscenceWindow;
  readonly cues: readonly Cue[];
  readonly notices: readonly Notice[];
}

const STAGE_LABEL = {
  early: "Early stage",
  middle: "Middle stage",
  late: "Late stage",
} as const;

const avoidLabel = (item: AvoidItem): string => {
  if (item.kind === "topic") return item.text;
  return item.name;
};

/** Notices say what they mean in words; the icon only backs the words up. */
function NoticeBanner({ notice }: { notice: Notice }) {
  return (
    <p className={styles.notice} data-level={notice.level} role="status">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
      <span>{notice.message}</span>
    </p>
  );
}

function PersonPage({ story, window }: Pick<KitViewProps, "story" | "window">) {
  const { firstName, birthYear, hometown, dementiaStage, seeds, avoidList } = story;
  return (
    <aside className={styles.leftPage} aria-labelledby="person-heading">
      <div className={styles.identity}>
        <p className={styles.kicker}>Life Story</p>
        <h2 id="person-heading" className={styles.personName}>
          {firstName}
        </h2>
        <p className={styles.facts}>
          <span>Born {birthYear}</span>
          <span>{hometown}</span>
          <span>{STAGE_LABEL[dementiaStage]}</span>
        </p>
      </div>

      <div className={styles.timeline}>
        <ReminiscenceTimeline birthYear={birthYear} window={window} personName={firstName} />
      </div>

      <section aria-labelledby="seeds-heading" className={`${styles.block} ${styles.seedsBlock}`}>
        <h3 id="seeds-heading" className={styles.blockTitle}>
          Seeds
        </h3>
        <ul className={styles.seeds}>
          {seeds.map((seed) => (
            <li key={seed.entityId} className={styles.seed}>
              <DomainGlyph domain={seed.domain} className={styles.seedGlyph} />
              <span className="visually-hidden">{DOMAIN_LABEL[seed.domain]}: </span>
              {seed.name}
            </li>
          ))}
        </ul>
      </section>

      {avoidList.length > 0 && (
        <details className={`${styles.avoid} ${styles.avoidBlock}`}>
          <summary>Avoid List: {avoidList.length}</summary>
          <p className={styles.avoidNote}>Kept out of the Kit and out of conversation Prompts.</p>
          <ul>
            {avoidList.map((item) => (
              <li key={avoidLabel(item)}>{avoidLabel(item)}</li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );
}

function GapCard({ hometown }: { hometown: string }) {
  return (
    <div className={styles.gap}>
      <h3>No music Cues this time</h3>
      <p>Nothing turned up for {hometown}. Your Life Story is safe. Try again in a moment.</p>
    </div>
  );
}

/**
 * The Kit as an album spread (UX 4.3): the Person on the left page, Cues on the
 * right. This is the interim, music-only view; Sessions, the trace and
 * Provenance arrive in later tickets.
 */
export function KitView({ story, window, cues, notices }: KitViewProps) {
  const { firstName, hometown } = story;
  return (
    <Container className={styles.kit}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Kit 1</p>
        <h1 className={styles.title}>{firstName}&rsquo;s Kit</h1>
        <p className={styles.lede}>
          Artists that people who share {firstName}&rsquo;s era, hometown and favorites often loved.
        </p>
      </header>

      {notices.length > 0 && (
        <div className={styles.notices}>
          {notices.map((notice) => (
            <NoticeBanner key={`${notice.code}-${notice.domain ?? "all"}`} notice={notice} />
          ))}
        </div>
      )}

      <div className={styles.spread}>
        <PersonPage story={story} window={window} />

        <section className={styles.rightPage} aria-labelledby="music-heading">
          <div className={styles.sectionHead}>
            <h2 id="music-heading" className={styles.sectionTitle}>
              Music
            </h2>
            <p className={styles.count}>{cues.length} artists</p>
          </div>
          {cues.length === 0 ? (
            <GapCard hometown={hometown} />
          ) : (
            <ul className={styles.grid}>
              {cues.map((cue, index) => (
                <li key={cue.entityId} className={styles.cell} data-featured={index === 0}>
                  <CueCard cue={cue} personName={firstName} index={index} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}
