"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/site/MessagePage";
import { useRepository, useStore, useStoreStatus } from "@/lib/store/useStore";
import { downloadText, exportFilename } from "./download";
import styles from "./YourData.module.css";

export interface ExportButtonProps {
  readonly label?: string;
  readonly variant?: "primary" | "secondary";
  /**
   * `auto` exports the Caregiver's data, or the data this version could not
   * read when that is all there is. `unreadable` always exports that data.
   */
  readonly source?: "auto" | "unreadable";
}

/**
 * Saves a copy of everything on this device as one JSON file (FR-26). The file
 * is built here in the browser and never sent anywhere.
 */
export function ExportButton({ label = "Export everything", variant = "primary", source = "auto" }: ExportButtonProps) {
  const repository = useRepository();
  const status = useStoreStatus();
  const lifeStories = useStore((state) => state.lifeStories);
  const draft = useStore((state) => state.draft);
  const [saved, setSaved] = useState<string | null>(null);

  const holdsNothing = lifeStories.length === 0 && draft === null;
  const useUnreadable = source === "unreadable" || status.readOnly || holdsNothing;

  function exportNow() {
    const unreadable = useUnreadable ? repository.exportUnreadable() : null;
    const text = unreadable ?? JSON.stringify(repository.exportAll());
    const filename = exportFilename(unreadable === null ? "export" : "unreadable", new Date().toISOString());
    downloadText(filename, text);
    setSaved(`Your file is downloading as ${filename}.`);
  }

  const Button = variant === "primary" ? PrimaryButton : SecondaryButton;
  return (
    <>
      <Button onClick={exportNow} disabled={status.phase === "loading"}>
        {label}
      </Button>
      <span role="status" className={styles.saved}>
        {saved}
      </span>
    </>
  );
}
