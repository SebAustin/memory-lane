/** UX section 8, "Privacy". The name is generic here: this page is not about one Person. */
export const PRIVACY_NOTE =
  "Life Stories stay in this browser. There are no accounts. We don't send their name to Qloo or the AI.";

/** The plain-language privacy note (FR-27, NFR-12). */
export function PrivacyNote({ className }: { readonly className?: string }) {
  return <p className={className}>{PRIVACY_NOTE}</p>;
}
