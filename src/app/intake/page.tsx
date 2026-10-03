import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Container } from "@/components/ui/Container";
import styles from "./intake.module.css";

export const metadata: Metadata = { title: "Start a Life Story" };

/** Stub (ticket 02): the six-step wizard lands in ticket 03. */
export default function IntakePage() {
  return (
    <SiteChrome>
      <Container className={styles.wrap}>
        <p className={styles.kicker}>Life Story</p>
        <h1 className={styles.title}>Start a Life Story</h1>
        <p className={styles.body}>
          The Life Story steps are not ready yet. Meet Margaret to see what a Kit looks like in the
          meantime.
        </p>
        <Link className={styles.link} href="/p/demo-margaret/kit">
          Meet Margaret
        </Link>
      </Container>
    </SiteChrome>
  );
}
