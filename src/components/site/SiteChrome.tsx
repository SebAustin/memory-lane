import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import styles from "./SiteChrome.module.css";

/** Shown in the footer of every screen (FR-28). UX copy guideline: the short line. */
export const NOT_MEDICAL_ADVICE = "Suggestions only, not medical advice.";

/** A photo corner: the wordmark's small nod to the album. */
function PhotoCorner() {
  return (
    <svg className={styles.mark} width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="24" height="24" rx="2" className={styles.markPaper} />
      <path d="M2 2h12L2 14z" className={styles.markCorner} />
      <circle cx="18" cy="16" r="3.5" className={styles.markDot} />
    </svg>
  );
}

/**
 * Page chrome for browsing surfaces: skip link, wordmark, landmarks, and the
 * not-medical-advice footer. Session Mode does not use it (UX section 1).
 * The top bar gains "Without Qloo" and "Your data" as those routes ship.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to main content
      </a>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <Link href="/" className={styles.wordmark}>
            <PhotoCorner />
            <span>Memory Lane</span>
          </Link>
        </Container>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <Container className={styles.footerInner}>
          <p className={styles.advice}>{NOT_MEDICAL_ADVICE}</p>
          <p className={styles.sign}>Memory Lane</p>
        </Container>
      </footer>
    </div>
  );
}
