import type { Metadata } from "next";
import { MessagePage, PrimaryLink } from "@/components/site/MessagePage";

export const metadata: Metadata = { title: "Start a Life Story" };

/** Stub (ticket 02): the six-step Life Story wizard lands in ticket 03. The `/intake` path is fixed by PLAN section 3.6. */
export default function StartLifeStoryPage() {
  return (
    <MessagePage
      kicker="Life Story"
      title="Start a Life Story"
      actions={<PrimaryLink href="/p/demo-margaret/kit">Meet Margaret</PrimaryLink>}
    >
      <p>
        The Life Story steps are not ready yet. Meet Margaret to see what a Kit looks like in the
        meantime.
      </p>
    </MessagePage>
  );
}
