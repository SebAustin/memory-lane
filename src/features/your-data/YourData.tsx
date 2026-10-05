"use client";

import { useStore, useStoreStatus } from "@/lib/store/useStore";
import { countsOf } from "./counts";
import { DeleteAllDialog } from "./DeleteAllDialog";
import { ExportButton } from "./ExportButton";
import { ImportDialog } from "./ImportDialog";
import { PrivacyNote } from "./PrivacyNote";
import { StoreBanner } from "./StoreBanner";
import styles from "./YourData.module.css";

/** One tally on the sheet: a big number and what it counts. */
function Tally({ value, label }: { readonly value: number; readonly label: string }) {
  return (
    <div className={styles.tally}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * `/about#privacy`: everything the Caregiver can do with what is stored on
 * this device. Export, import and delete are first-class (FR-26, FR-27, NFR-12).
 */
export function YourData() {
  const status = useStoreStatus();
  const lifeStories = useStore((state) => state.lifeStories);
  const kits = useStore((state) => state.kits);
  const sessionLogs = useStore((state) => state.sessionLogs);
  const counts = countsOf({ lifeStories, kits, sessionLogs });
  const ready = status.phase === "ready";

  return (
    <section id="privacy" aria-labelledby="your-data-heading" className={styles.sheet}>
      <div className={styles.head}>
        <p className={styles.kicker}>Privacy</p>
        <h2 id="your-data-heading" className={styles.heading} tabIndex={-1}>
          Your data
        </h2>
        <PrivacyNote />
      </div>

      <StoreBanner linkToYourData={false} />

      <div>
        <h3 className={styles.subheading}>On this device now</h3>
        <dl className={styles.tallies} aria-busy={!ready}>
          <Tally value={counts.lifeStories} label={counts.lifeStories === 1 ? "Life Story" : "Life Stories"} />
          <Tally value={counts.kits} label={counts.kits === 1 ? "Kit" : "Kits"} />
          <Tally value={counts.sessionLogs} label={counts.sessionLogs === 1 ? "Session Log" : "Session Logs"} />
        </dl>
      </div>

      <ul className={styles.rows}>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <h3 className={styles.rowTitle}>Save a copy</h3>
            <p>
              One file with every Life Story, Kit and Session Log. It is made in this browser and goes nowhere
              else. Keep it somewhere safe: anyone who has the file can read it.
            </p>
          </div>
          <div className={styles.rowAction}>
            <ExportButton />
          </div>
        </li>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <h3 className={styles.rowTitle}>Bring a copy back</h3>
            <p>
              Choose a file you exported from Memory Lane, up to 512 KB. You will see what it holds and confirm
              before anything is replaced.
            </p>
          </div>
          <div className={styles.rowAction}>
            <ImportDialog />
          </div>
        </li>
        <li className={`${styles.row} ${styles.rowDanger}`}>
          <div className={styles.rowText}>
            <h3 className={styles.rowTitle}>Delete everything</h3>
            <p>
              Removes every Life Story, Kit, Session Log and unfinished draft from this browser. It cannot be
              undone, so save a copy first. On a shared computer, do this when you are done.
            </p>
          </div>
          <div className={styles.rowAction}>
            <DeleteAllDialog />
          </div>
        </li>
      </ul>
    </section>
  );
}
