"use client";

import { MessagePage, PrimaryButton, SecondaryLink } from "@/components/site/MessagePage";

/**
 * Root error boundary: any uncaught render error lands here, branded, with the
 * not-medical-advice footer (FR-28). The reassurance is true by design: Life
 * Stories live in this browser (ADR 0001), so a server error cannot lose one.
 */
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <MessagePage
      kicker="Something went wrong"
      title="We couldn't show this page"
      actions={
        <>
          <PrimaryButton onClick={reset}>Try again</PrimaryButton>
          <SecondaryLink href="/">Back to the start</SecondaryLink>
        </>
      }
    >
      <p>Your Life Story is safe on this device. Nothing was lost.</p>
      <p>Give it a moment and try again. If it keeps happening, come back a little later.</p>
    </MessagePage>
  );
}
