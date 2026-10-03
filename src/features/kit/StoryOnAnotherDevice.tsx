import Link from "next/link";
import { Container } from "@/components/ui/Container";
import styles from "./StoryOnAnotherDevice.module.css";

/**
 * Life Stories live on the device that made them (ADR 0001), so a link to one
 * opened elsewhere cannot show it. UX section 1 gives the wording.
 */
export function StoryOnAnotherDevice() {
  return (
    <Container className={styles.wrap}>
      <h1 className={styles.title}>This Life Story lives on another device</h1>
      <p className={styles.body}>
        Import it from a file. Or meet Margaret to see what a Kit looks like.
      </p>
      <Link className={styles.link} href="/p/demo-margaret/kit">
        Meet Margaret
      </Link>
    </Container>
  );
}
