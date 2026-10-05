"use client";

import { useState } from "react";
import { SecondaryButton } from "@/components/site/MessagePage";
import { DialogActions, ModalDialog } from "@/components/ui/ModalDialog";
import { useRepository } from "@/lib/store/useStore";
import { ExportButton } from "./ExportButton";
import styles from "./YourData.module.css";

const DELETED = "Everything has been removed from this device.";
const NOT_DELETED =
  "We couldn't delete everything. Your browser would not let us, so your data may still be here. Close other Memory Lane tabs and try again.";

/**
 * Delete all (FR-27): one deliberate, confirmed action. The confirmation stays
 * until the Caregiver chooses; nothing times out. The copy is the UX section 8 string.
 */
export function DeleteAllDialog() {
  const repository = useRepository();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<"deleted" | "failed" | null>(null);

  async function deleteEverything() {
    setWorking(true);
    try {
      await repository.deleteAll();
      setOutcome("deleted");
    } catch {
      setOutcome("failed");
    }
    setWorking(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          setOutcome(null);
          setOpen(true);
        }}
      >
        Delete all data
      </button>
      <div role="status" className={styles.result}>
        {outcome === "deleted" && DELETED}
      </div>
      {outcome === "failed" && (
        <p role="alert" className={styles.problem}>
          {NOT_DELETED}
        </p>
      )}
      <ModalDialog open={open} title="Delete all data?" onClose={() => setOpen(false)}>
        <p>
          This removes every Life Story and Session Log from this device. Export first if you want a copy.
        </p>
        <DialogActions>
          <ExportButton variant="secondary" label="Export" />
          <button
            type="button"
            className={styles.danger}
            onClick={() => void deleteEverything()}
            disabled={working}
            aria-busy={working}
          >
            {working ? "Deleting…" : "Delete everything"}
          </button>
          <SecondaryButton data-autofocus onClick={() => setOpen(false)} disabled={working}>
            Cancel
          </SecondaryButton>
        </DialogActions>
      </ModalDialog>
    </>
  );
}
