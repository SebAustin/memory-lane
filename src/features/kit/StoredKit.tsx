"use client";

import { MessagePage, PrimaryButton, SecondaryLink } from "@/components/site/MessagePage";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Container } from "@/components/ui/Container";
import { reminiscenceWindow } from "@/domain/window";
import { useStore, useStoreStatus } from "@/lib/store/useStore";
import { KitView } from "./KitView";
import { StoryOnAnotherDevice } from "./StoryOnAnotherDevice";
import { useInterimKit } from "./useInterimKit";
import styles from "./StoredKit.module.css";

/**
 * The Kit for a Life Story kept in this browser (ADR 0001). The story lives on
 * the device, so this reads it from the local store, then asks the server for
 * Cues using only the digest and Taste Profile. If the story is not here (a
 * link opened on another device), it says so.
 */
export function StoredKit({ storyId }: { storyId: string }) {
  const status = useStoreStatus();
  const story = useStore((state) => state.lifeStories.find((candidate) => candidate.id === storyId));
  const profile = useStore((state) => state.profiles[storyId]);
  const { load, retry } = useInterimKit(story, profile);

  if (status.phase === "loading") {
    return (
      <SiteChrome>
        <Container className={styles.wait}>
          <p role="status" className={styles.waitText}>
            Opening this Life Story&hellip;
          </p>
        </Container>
      </SiteChrome>
    );
  }
  if (story === undefined) return <StoryOnAnotherDevice />;

  if (load.phase === "loading") {
    return (
      <SiteChrome>
        <Container className={styles.wait}>
          <div className={styles.sheet} aria-busy="true">
            <p className={styles.kicker}>Kit 1</p>
            <h1 className={styles.title}>Building {story.firstName}&rsquo;s Kit</h1>
            <p role="status" className={styles.waitText}>
              Asking Qloo for artists that people who share {story.firstName}&rsquo;s era, hometown and favorites often loved.
            </p>
            <div className={styles.frames} aria-hidden="true">
              <span /> <span /> <span />
            </div>
          </div>
        </Container>
      </SiteChrome>
    );
  }
  if (load.phase === "failed") {
    return (
      <MessagePage
        title="We couldn't build the Kit this time"
        actions={
          <>
            <PrimaryButton onClick={retry}>Try again</PrimaryButton>
            <SecondaryLink href="/p/demo-margaret/kit">Meet Margaret</SecondaryLink>
          </>
        }
      >
        <p>Nothing was lost. {story.firstName}&rsquo;s Life Story is safe on this device.</p>
      </MessagePage>
    );
  }
  return (
    <SiteChrome>
      <KitView
        story={story}
        window={reminiscenceWindow(story.birthYear)}
        cues={load.kit.cues}
        notices={load.kit.notices}
      />
    </SiteChrome>
  );
}
