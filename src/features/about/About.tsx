import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { YourData } from "@/features/your-data/YourData";
import styles from "./About.module.css";

/** The full not-medical-advice line (UX section 8), written without a name because this page is about the app. */
const FULL_ADVICE =
  "Memory Lane suggests activities. It is not medical advice or therapy. Stop if the Person seems upset, and talk to their care team about changes in mood or health.";

/**
 * `/about`: how Memory Lane works, what the research does and does not say,
 * where Qloo fits, and the limits. `#privacy` is Your data (FR-26, FR-27).
 */
export function About() {
  return (
    <Container className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>About</p>
        <h1 className={styles.title}>How Memory Lane works</h1>
        <p className={styles.lede}>
          A few things you know about someone, turned into a week of gentle reminiscence Sessions built from what
          people of their era and place tended to love.
        </p>
      </header>

      <section aria-labelledby="how-heading" className={styles.section}>
        <h2 id="how-heading" className={styles.heading}>
          How it works
        </h2>
        <ol className={styles.steps}>
          <li>
            <h3>You tell us about them</h3>
            <p>
              A first name, a birth year, where they grew up, and a few favorites. Each favorite is matched to a real
              artist, film or place, so nothing is made up.
            </p>
          </li>
          <li>
            <h3>Qloo finds what their generation loved</h3>
            <p>
              We look at the years when they were about 10 to 30, the Reminiscence Window, and ask Qloo what people
              who share that era and those favorites tend to love.
            </p>
          </li>
          <li>
            <h3>You get a Kit to run</h3>
            <p>
              Music, films, places and more, arranged into Sessions with gentle Prompts. You run a Session together
              and note how each Cue lands, and the next Kit learns from it.
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="evidence-heading" className={styles.section}>
        <h2 id="evidence-heading" className={styles.heading}>
          What the research says
        </h2>
        <div className={styles.prose}>
          <p>
            Research suggests that reminiscence activities, such as sharing music and stories from the past, may bring
            small benefits for mood and a sense of connection for some people living with dementia. The evidence is
            modest and mixed, and it does not show that any activity slows or reverses memory loss.
          </p>
          <p>
            Memory Lane makes preparing a session easier and more personal. It does not claim to treat anything.
          </p>
        </div>
      </section>

      <section aria-labelledby="qloo-heading" className={styles.section}>
        <h2 id="qloo-heading" className={styles.heading}>
          Where Qloo comes in
        </h2>
        <div className={styles.prose}>
          <p>
            Qloo is a taste graph built from how people in different places and times relate to music, film, food and
            more. We use it to find Cues that people who share someone&rsquo;s era and favorites tend to love.
          </p>
          <p>
            That is a statement about groups, never a fact about one person. A Cue is a starting point for a
            conversation, and you know them best.
          </p>
        </div>
      </section>

      <section aria-labelledby="limits-heading" className={styles.section}>
        <h2 id="limits-heading" className={styles.heading}>
          Limits
        </h2>
        <ul className={styles.limits}>
          <li>{FULL_ADVICE}</li>
          <li>
            A Cue can miss. Skip anything that does not feel right, and add anything that must never appear to the
            Avoid List.
          </li>
          <li>
            Life Stories live only in this browser. Clearing your browser data, or using another device, means they are
            gone unless you saved a copy below.
          </li>
          <li>
            Anyone who uses this browser can open them. On a shared computer, delete your data when you are done.
          </li>
          <li>
            To build a Kit, only what is needed (favorites, an era and a place, with the first name removed) goes to
            Qloo and to the AI that arranges Sessions. Nothing is stored on our servers.
          </li>
        </ul>
        <p>
          <Link href="/intake" className={styles.link}>
            Start a Life Story
          </Link>
        </p>
      </section>

      <YourData />
    </Container>
  );
}
