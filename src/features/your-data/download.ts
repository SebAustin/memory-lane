/** Starts a browser download of `text`, built here in the browser (no server round trip, ADR 0001). */

const REVOKE_AFTER_MS = 4000;

/** `memory-lane-export-2026-10-04.json`. The date is the UTC day of `iso`. */
export function exportFilename(kind: "export" | "unreadable", iso: string): string {
  return `memory-lane-${kind}-${iso.slice(0, 10)}.json`;
}

/** Offers `text` to the Caregiver as a file called `filename`. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Safari starts reading the blob after click() returns, so let go of it a little later.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}
