import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site/SiteChrome";
import { StoryId } from "@/contracts";
import { MARGARET, MARGARET_STORY_ID } from "@/demo/margaret";
import { reminiscenceWindow } from "@/domain/window";
import { KitView } from "@/features/kit/KitView";
import { StoredKit } from "@/features/kit/StoredKit";
import { loadDemoKit } from "@/server/kit/demoKit";

export async function generateMetadata({ params }: PageProps<"/p/[storyId]/kit">): Promise<Metadata> {
  const { storyId } = await params;
  return { title: storyId === MARGARET_STORY_ID ? `${MARGARET.firstName}'s Kit` : "Kit" };
}

/**
 * `/p/[storyId]/kit`. Interim (tickets 02 and 04): the public demo story is built on
 * the server with `buildInterimKit`, the core behind `/api/kit`. Any other story lives
 * in the visitor's browser (ADR 0001), so `StoredKit` reads it there and asks the same
 * endpoint with its digest. Ticket 15 replaces both with the streamed build.
 */
export default async function KitPage({ params }: PageProps<"/p/[storyId]/kit">) {
  const { storyId } = await params;
  const parsed = StoryId.safeParse(storyId);
  if (!parsed.success) notFound();

  if (parsed.data !== MARGARET_STORY_ID) {
    return <StoredKit storyId={parsed.data} />;
  }

  const kit = await loadDemoKit();
  return (
    <SiteChrome>
      <KitView
        story={MARGARET}
        window={reminiscenceWindow(MARGARET.birthYear)}
        cues={kit.cues}
        notices={kit.notices}
      />
    </SiteChrome>
  );
}
