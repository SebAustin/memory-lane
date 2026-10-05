"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ModalDialog.module.css";

export interface ModalDialogProps {
  readonly open: boolean;
  readonly title: string;
  /** Called for Esc, a click on the backdrop, and anything else that dismisses the dialog. */
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * A modal over the page, on the native `<dialog>` element: the browser traps
 * focus inside it, closes it on Esc, and puts focus back on whatever opened it.
 * The caller decides what the choices are; there is no timed dismissal.
 */
export function ModalDialog({ open, title, onClose, children }: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start on the safe choice: whatever the caller marked, rather than the first button.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.sheet}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** The row of choices at the foot of a dialog. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
