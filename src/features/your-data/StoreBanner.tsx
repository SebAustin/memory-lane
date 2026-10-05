"use client";

import Link from "next/link";
import type { StoreStatus } from "@/lib/store/repository";
import { useStoreStatus } from "@/lib/store/useStore";
import { ExportButton } from "./ExportButton";
import styles from "./StoreBanner.module.css";

/** Each says what happened, that nothing is lost, and what to do (UX section 8). */
export function messagesFor(status: StoreStatus): string[] {
  if (status.phase === "loading") return [];
  const unreadableOnly = status.readOnly && !status.setAsideFailed;
  return [
    unreadableOnly
      ? "This device holds Life Stories from a newer version of Memory Lane. You can look around, but nothing can be saved here."
      : null,
    status.setAsideFailed
      ? "Some saved data on this device could not be read, and we couldn't set a copy aside. To keep it safe, nothing can be saved here until you export it or delete everything."
      : null,
    status.quarantined
      ? "Some saved data on this device could not be read, so we started fresh. The old copy is set aside, not deleted."
      : null,
    status.storage === "memory"
      ? "This browser cannot keep a draft between visits. Keep this tab open until you finish."
      : null,
    status.saveFailed
      ? "We could not save your last change on this device. It is still here while this tab stays open."
      : null,
  ].filter((message): message is string => message !== null);
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

/**
 * What the Caregiver should know about where their data is kept (PLAN section
 * 6): newer-version data, unreadable data, a browser with no IndexedDB, a
 * failed save. Each banner offers Export, so a copy can be saved before anything else happens.
 */
export function StoreBanner({ linkToYourData = true }: { readonly linkToYourData?: boolean }) {
  const status = useStoreStatus();
  const messages = messagesFor(status);
  if (messages.length === 0) return null;
  const hasUnreadable = status.readOnly || status.quarantined;
  return (
    <section role="status" aria-label="About your saved data" className={styles.banner}>
      {messages.map((message) => (
        <p key={message} className={styles.message}>
          <InfoIcon />
          <span>{message}</span>
        </p>
      ))}
      <div className={styles.actions}>
        <ExportButton
          variant="secondary"
          label={hasUnreadable ? "Export the unreadable data" : "Export a copy"}
          source={hasUnreadable ? "unreadable" : "auto"}
        />
        {linkToYourData && (
          <Link href="/about#privacy" className={styles.link}>
            Your data
          </Link>
        )}
      </div>
    </section>
  );
}
