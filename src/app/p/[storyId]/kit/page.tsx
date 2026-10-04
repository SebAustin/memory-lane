import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site/SiteChrome";
import { StoryId } from "@/contracts";
import { MARGARET, MARGARET_STORY_ID } from "@/demo/margaret";
import { reminiscenceWindow } from "@/domain/window";
import { KitView } from "@/features/kit/KitView";
import { StoryOnAnotherDevice } from "@/features/kit/StoryOnAnotherDevice";
import { loadDemoKit } from "@/server/kit/demoKit";

export async function generateMetadata({ params }: PageProps<"/p/[storyId]/kit">): Promise<Metadata> {
  const { storyId } = await params;
  return { title: storyId === MARGARET_STORY_ID ? `${MARGARET.firstName}'s Kit` : "Kit" };
}

/**
 * `/p/[storyId]/kit`. Interim (ticket 02): only the public demo story exists, and
 * its music Cues come from `buildInterimKit`, the core behind `/api/kit`. Ticket 15
 * replaces this with the streamed build; ticket 03 adds Life Stories from the store.
 */
export default async function KitPage({ params }: PageProps<"/p/[storyId]/kit">) {
  const { storyId } = await params;
  const parsed = StoryId.safeParse(storyId);
  if (!parsed.success) notFound();

  if (parsed.data !== MARGARET_STORY_ID) {
    return <StoryOnAnotherDevice />;
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
