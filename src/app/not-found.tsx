import { MessagePage, PrimaryLink, SecondaryLink } from "@/components/site/MessagePage";

/** Branded 404, with the not-medical-advice footer (FR-28). */
export default function NotFound() {
  return (
    <MessagePage
      kicker="Page not found"
      title="We couldn't find that page"
      actions={
        <>
          <PrimaryLink href="/">Back to the start</PrimaryLink>
          <SecondaryLink href="/p/demo-margaret/kit">Meet Margaret</SecondaryLink>
        </>
      }
    >
      <p>Your Life Story is safe on this device. The link may be old or mistyped.</p>
    </MessagePage>
  );
}
