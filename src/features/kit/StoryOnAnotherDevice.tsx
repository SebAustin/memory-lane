import { MessagePage, PrimaryLink } from "@/components/site/MessagePage";

/**
 * Life Stories live on the device that made them (ADR 0001), so a link to one
 * opened elsewhere cannot show it. UX section 1 gives the wording.
 */
export function StoryOnAnotherDevice() {
  return (
    <MessagePage
      title="This Life Story lives on another device"
      actions={<PrimaryLink href="/p/demo-margaret/kit">Meet Margaret</PrimaryLink>}
    >
      <p>Import it from a file. Or meet Margaret to see what a Kit looks like.</p>
    </MessagePage>
  );
}
