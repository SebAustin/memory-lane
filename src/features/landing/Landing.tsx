import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Container } from "@/components/ui/Container";
import { DomainGlyph } from "@/components/ui/DomainGlyph";
import { DOMAIN_LABEL } from "@/components/ui/domain";
import { Monogram } from "@/components/ui/Monogram";
import type { Domain } from "@/contracts";
import { MARGARET_STORY_ID } from "@/demo/margaret";
import styles from "./Landing.module.css";

const MEET_MARGARET_HREF = `/p/${MARGARET_STORY_ID}/kit`;

interface Sample {
  readonly name: string;
  readonly domain: Domain;
  readonly detail: string;
  readonly position: "a" | "b" | "c";
}

/** The three sample prints on the hero: Margaret's own Seeds and her hometown. */
const SAMPLES: readonly Sample[] = [
  { name: "Patsy Cline", domain: "music", detail: "Music", position: "a" },
  { name: "Pillow Talk", domain: "film", detail: "Film, 1959", position: "b" },
  { name: "Beale Street", domain: "place", detail: "Place", position: "c" },
];

const STEPS = [
  {
    title: "Tell us who they are",
    body: "A first name, a birth year, where they grew up and a few favorites. A few minutes, and it stays on this device.",
  },
  {
    title: "Watch it work",
    body: "Memory Lane asks Qloo what people of their era and place loved, then arranges Sessions with Prompts and tips. You can see every step.",
  },
  {
    title: "Run it, then it learns",
    body: "Sit down together, one Cue at a time. Note how each one lands, and the next Kit leans toward what worked.",
  },
] as const;

const GENERIC_LIST = ["Top hits of the 1950s", "Songs everyone knows", "Whatever the AI remembers"] as const;
const QLOO_SAMPLE = ["Loretta Lynn", "Brenda Lee", "Skeeter Davis"] as const;

function Polaroid({ sample }: { sample: Sample }) {
  return (
    <div className={styles.polaroid} data-position={sample.position}>
      <div className={styles.print}>
        <Monogram name={sample.name} domain={sample.domain} />
      </div>
      <p className={styles.polaroidMeta}>
        <DomainGlyph domain={sample.domain} className={styles.polaroidGlyph} />
        <span>{DOMAIN_LABEL[sample.domain]}</span>
        {sample.domain === "film" && <span>1959</span>}
      </p>
      <p className={styles.polaroidName}>{sample.name}</p>
    </div>
  );
}

function Hero() {
  return (
    <Container className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>For families and care teams</p>
        <h1 className={styles.headline} id="hero-heading">
          Songs, films and places that feel like <em>their</em> youth.
        </h1>
        <p className={styles.lede}>
          Memory Lane builds a week of reminiscence Sessions for someone you care for, drawn from what
          people of their era, place and favorites tend to love.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={MEET_MARGARET_HREF}>
            Meet Margaret
            <svg className={styles.arrow} width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true" focusable="false">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link className={styles.secondary} href="/intake">
            Start a Life Story
          </Link>
        </div>
        <p className={styles.assurance}>No sign-up. Nothing to install. Life Stories stay on this device.</p>
      </div>

      <figure className={styles.album}>
        <div className={styles.stack} aria-hidden="true">
          {SAMPLES.map((sample) => (
            <Polaroid key={sample.name} sample={sample} />
          ))}
        </div>
        <figcaption className={styles.caption}>
          <span className={styles.captionLabel}>A sample Life Story</span>
          Margaret, born 1946 in Memphis. She loves Patsy Cline and Doris Day films.
        </figcaption>
      </figure>
    </Container>
  );
}

function HowItWorks() {
  return (
    <section className={styles.how} aria-labelledby="how-heading">
      <Container>
        <h2 id="how-heading" className={styles.sectionTitle}>
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.step}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function Difference() {
  return (
    <section className={styles.difference} aria-labelledby="difference-heading">
      <Container>
        <h2 id="difference-heading" className={styles.sectionTitle}>
          Not just a list of old hits
        </h2>
        <div className={styles.panels}>
          <div className={styles.panel} data-kind="generic">
            <p className={styles.panelLabel}>Without Qloo</p>
            <ul className={styles.struck}>
              {GENERIC_LIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.panelNote}>Generic, and the same for everyone.</p>
          </div>
          <div className={styles.panel} data-kind="qloo">
            <p className={styles.panelLabel}>With Qloo, for someone like Margaret</p>
            <ul className={styles.picks}>
              {QLOO_SAMPLE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.panelNote}>
              Every Cue is a real Qloo entity, chosen for people who share her era, hometown and
              favorites. Sample from fixture data.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** The landing page (UX 4.1): an editorial opening, one primary action, one quiet one. */
export function Landing() {
  return (
    <SiteChrome>
      <Hero />
      <HowItWorks />
      <Difference />
    </SiteChrome>
  );
}
