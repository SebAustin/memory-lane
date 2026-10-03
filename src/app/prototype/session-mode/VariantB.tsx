"use client";

/**
 * PROTOTYPE, throwaway. Variant B: "The Window" (UX 10.B).
 * Idea: the picture IS the screen, edge to edge, with one big caption and one short Prompt. Reactions sit
 * in a wide rail just above the bottom bar so they are always under the thumb. Best for late stage.
 */

import { useState } from "react";
import { DOMAIN_LABEL, PERSON, REACTIONS, CUES, itemTitle } from "./fixture";
import { useSession } from "./SessionContext";
import { SessionOverlays } from "./SessionOverlays";
import {
  ArrowIcon,
  CuePicture,
  DistressBanner,
  EndButton,
  ForYou,
  PauseIcon,
  ReactionGlyph,
  ReactionRadios,
  SessionStatus,
  useTitleFocus,
} from "./shared";

export function VariantB() {
  const { state, items, item, total, loggedCount, overlayOpen, actions } = useSession();
  const titleRef = useTitleFocus<HTMLHeadingElement>(item.id);
  const [promptIndex, setPromptIndex] = useState<Readonly<Record<string, 0 | 1>>>({});
  const [forYouOpen, setForYouOpen] = useState(false);
  const cue = item.kind === "cue" ? item : null;
  const sensory = item.kind === "sensory" ? item : null;
  const isFirst = state.index === 0;
  const shownPrompt = cue ? (promptIndex[cue.id] ?? 0) : 0;

  function togglePrompt() {
    if (!cue) return;
    const next: 0 | 1 = shownPrompt === 0 ? 1 : 0;
    setPromptIndex((current) => ({ ...current, [cue.id]: next }));
  }

  function goNext() {
    setForYouOpen(false);
    actions.next();
  }
  function goBack() {
    setForYouOpen(false);
    actions.back();
  }
  function goSkip() {
    setForYouOpen(false);
    actions.skip();
  }

  return (
    <div className="pm-shell">
      <div className="pm-body" inert={overlayOpen}>
        <main className="pm-b-stage">
          <CuePicture item={item} fill />
          {!cue ? <div className="pm-b-breath" aria-hidden="true" /> : null}

          <header className="pm-b-top">
            <ol className="pm-b-progress" aria-label="Session progress">
              {items.map((it, index) => {
                const reaction = it.kind === "cue" ? state.reactions[it.id] : undefined;
                return (
                  <li
                    key={it.id}
                    className="pm-b-seg"
                    data-current={index === state.index}
                    data-reaction={reaction}
                  >
                    {reaction ? <ReactionGlyph reaction={reaction} size={18} /> : null}
                    <span className="pm-sr">
                      {itemTitle(it)}
                      {reaction ? `: ${REACTIONS[reaction].label}` : ""}
                      {index === state.index ? " (current)" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="pm-b-count">
              {state.index + 1} of {total} · {loggedCount}/{CUES.length} logged
            </p>
            {cue ? (
              <button
                type="button"
                className="pm-btn pm-btn--ghost"
                aria-expanded={forYouOpen}
                aria-controls="pm-b-foryou"
                onClick={() => setForYouOpen((open) => !open)}
                style={{ background: "var(--bg)" }}
              >
                For you
              </button>
            ) : null}
            <button type="button" className="pm-btn" onClick={actions.pause}>
              <PauseIcon /> Pause
            </button>
          </header>

          {cue && forYouOpen ? (
            <section
              id="pm-b-foryou"
              className="pm-b-foryou"
              aria-label="For you"
              onKeyDown={(event) => {
                if (event.key === "Escape") setForYouOpen(false);
              }}
            >
              <ForYou cue={cue} />
            </section>
          ) : null}

          <section className="pm-b-caption" key={item.id} aria-label="Current Cue">
            {cue ? (
              <>
                <p className="pm-tag">
                  {DOMAIN_LABEL[cue.domain]} · {cue.year}
                </p>
                <h1 ref={titleRef} tabIndex={-1} className="pm-title pm-b-title">
                  {cue.name}
                </h1>
                <p className="pm-prompt pm-b-prompt">{cue.prompts[shownPrompt]}</p>
                <div className="pm-b-more">
                  <button type="button" className="pm-btn pm-btn--ghost" onClick={togglePrompt}>
                    Another way in ({shownPrompt + 1} of 2)
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="pm-tag">Sensory activity</p>
                <h1 ref={titleRef} tabIndex={-1} className="pm-title pm-b-title">
                  {sensory?.title}
                </h1>
                <p className="pm-prompt pm-b-prompt">{sensory?.instruction}</p>
              </>
            )}
          </section>
        </main>

        {cue ? (
          <div className="pm-b-banner-slot">
            <DistressBanner cue={cue} />
          </div>
        ) : null}

        <div className="pm-b-rail">
          {cue ? (
            <ReactionRadios cue={cue} className="pm-reactions--rail" />
          ) : (
            <p className="pm-b-rail-note">
              Sensory activity. Nothing to log. Notice how {PERSON.name} responds, then press Next.
            </p>
          )}
        </div>

        <footer className="pm-bar">
          <button type="button" className="pm-btn pm-btn--ghost" disabled={isFirst} onClick={goBack}>
            <ArrowIcon dir="left" /> Back
          </button>
          <button type="button" className="pm-btn pm-btn--ghost" onClick={goSkip}>
            Skip
          </button>
          <button type="button" className="pm-btn" onClick={goNext}>
            Next <ArrowIcon dir="right" />
          </button>
          <span className="pm-bar-spacer" />
          <EndButton />
        </footer>
      </div>

      <SessionOverlays />
      <SessionStatus />
    </div>
  );
}
