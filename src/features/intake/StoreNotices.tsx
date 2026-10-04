import type { StoreStatus } from "@/lib/store/repository";
import styles from "./Wizard.module.css";

/** What the Caregiver should know about where their answers are kept. Says what happened, that nothing is lost, and what to do. */
function messagesFor(status: StoreStatus): string[] {
  if (status.phase === "loading") return [];
  return [
    status.readOnly
      ? "This device holds Life Stories from a newer version of Memory Lane. You can look around, but nothing can be saved here."
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

export function StoreNotices({ status }: { status: StoreStatus }) {
  const messages = messagesFor(status);
  if (messages.length === 0) return null;
  return (
    <div role="status" className={styles.notices}>
      {messages.map((message) => (
        <p key={message} className={styles.notice}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          <span>{message}</span>
        </p>
      ))}
    </div>
  );
}
