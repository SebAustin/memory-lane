"use client";

import { useRef, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/site/MessagePage";
import { DialogActions, ModalDialog } from "@/components/ui/ModalDialog";
import { MAX_IMPORT_BYTES, importFailure, type ImportCounts } from "@/lib/store/importFile";
import { useRepository, useStore } from "@/lib/store/useStore";
import { countsOf, describeCounts } from "./counts";
import { ExportButton } from "./ExportButton";
import styles from "./YourData.module.css";

/** Where the import flow is: waiting, asking "replace everything?", or reporting what happened. */
type Stage =
  | { readonly kind: "idle" }
  | { readonly kind: "confirm"; readonly text: string; readonly counts: ImportCounts; readonly migratedFrom?: number }
  | { readonly kind: "done"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string };

const READ_FAILED = "We couldn't open that file. Nothing on this device changed. Try choosing it again.";

/** Reads the chosen file, or says why it will not be. Files over the cap are never read. */
async function readChosen(file: File): Promise<{ text: string } | { message: string }> {
  if (file.size > MAX_IMPORT_BYTES) return { message: importFailure("too_large").message };
  try {
    return { text: await file.text() };
  } catch {
    return { message: READ_FAILED };
  }
}

/**
 * Import (FR-26): choose a file, see what it holds, confirm, then replace. The
 * repository checks the whole file before it changes anything, so a bad file
 * is turned away with a message and nothing on this device moves.
 */
export function ImportDialog() {
  const repository = useRepository();
  const lifeStories = useStore((state) => state.lifeStories);
  const kits = useStore((state) => state.kits);
  const sessionLogs = useStore((state) => state.sessionLogs);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onChosen(file: File | undefined) {
    if (file === undefined) return;
    const chosen = await readChosen(file);
    if ("message" in chosen) return setStage({ kind: "failed", message: chosen.message });
    const preview = repository.previewImport(chosen.text);
    if (!preview.ok) return setStage({ kind: "failed", message: preview.message });
    setStage(
      preview.migratedFrom === undefined
        ? { kind: "confirm", text: chosen.text, counts: preview.counts }
        : { kind: "confirm", text: chosen.text, counts: preview.counts, migratedFrom: preview.migratedFrom },
    );
  }

  async function replace(text: string) {
    setWorking(true);
    const result = await repository.importAll(text);
    setWorking(false);
    setStage(
      result.ok
        ? { kind: "done", message: `Imported ${describeCounts(result.counts)}. They replaced what was here.` }
        : { kind: "failed", message: result.message },
    );
  }

  const here = describeCounts(countsOf({ lifeStories, kits, sessionLogs }));
  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Memory Lane export file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void onChosen(file);
        }}
      />
      <SecondaryButton onClick={() => fileInput.current?.click()}>Choose a file to import</SecondaryButton>
      <div role="status" className={styles.result}>
        {stage.kind === "done" && stage.message}
      </div>
      {stage.kind === "failed" && (
        <p role="alert" className={styles.problem}>
          {stage.message}
        </p>
      )}
      <ModalDialog
        open={stage.kind === "confirm"}
        title="Replace everything on this device?"
        onClose={() => setStage({ kind: "idle" })}
      >
        {stage.kind === "confirm" && (
          <>
            <p>
              This file holds {describeCounts(stage.counts)}. Importing replaces what is here now ({here}), including
              any unfinished draft. Export first if you want a copy.
            </p>
            {stage.migratedFrom !== undefined && (
              <p>This file is from an older version of Memory Lane. It will be brought up to date as it is imported.</p>
            )}
            <DialogActions>
              <PrimaryButton onClick={() => void replace(stage.text)} disabled={working} aria-busy={working}>
                {working ? "Importing…" : "Replace everything"}
              </PrimaryButton>
              <ExportButton variant="secondary" label="Export first" />
              <SecondaryButton data-autofocus onClick={() => setStage({ kind: "idle" })} disabled={working}>
                Cancel
              </SecondaryButton>
            </DialogActions>
          </>
        )}
      </ModalDialog>
    </>
  );
}
