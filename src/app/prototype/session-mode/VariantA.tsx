"use client";

/**
 * PROTOTYPE, throwaway. Variant A: "Turn the Page" (UX 10.A).
 * Idea: a flat two-page scrapbook spread, photo on the left page and words on the right. Reactions are
 * ink stamps on the page. Next and Back turn the page. Best for two people sharing one tablet.
 */

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

export function VariantA() {
  const { state, items, item, total, loggedCount, overlayOpen, actions } = useSession();
  const titleRef = useTitleFocus<HTMLHeadingElement>(item.id);
  const cue = item.kind === "cue" ? item : null;
  const sensory = item.kind === "sensory" ? item : null;
  const isFirst = state.index === 0;

  return (
    <div className="pm-shell">
      <div className="pm-body" inert={overlayOpen}>
        <header className="pm-a-top">
          <p className="pm-a-count">
            {cue ? "Cue" : "Sensory"} {state.index + 1} of {total}
          </p>
          <p className="pm-a-tally">
            {loggedCount} of {CUES.length} Reactions logged
          </p>
          <ol className="pm-dots" aria-label="Session progress">
            {items.map((it, index) => {
              const reaction = it.kind === "cue" ? state.reactions[it.id] : undefined;
              const current = index === state.index;
              return (
                <li key={it.id} className="pm-dot" data-current={current} data-reaction={reaction}>
                  {reaction ? <ReactionGlyph reaction={reaction} size={20} /> : <span aria-hidden="true">{index + 1}</span>}
                  <span className="pm-sr">
                    {itemTitle(it)}
                    {reaction ? `: ${REACTIONS[reaction].label}` : ""}
                    {current ? " (current)" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
          <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.pause}>
            <PauseIcon /> Pause
          </button>
        </header>

        <main className="pm-a-main">
          {cue ? <DistressBanner cue={cue} /> : null}

          <div className="pm-a-spread" key={item.id} data-dir={state.dir}>
            <figure className="pm-a-left">
              <div className="pm-a-mat">
                <CuePicture item={item} />
              </div>
              <figcaption className="pm-a-caption">
                {cue ? `${cue.detail}, ${cue.year}` : "A hands-on moment"}
              </figcaption>
            </figure>

            {cue ? (
              <article className="pm-a-right">
                <span className="pm-a-folio" aria-hidden="true">
                  page {state.index + 1}
                </span>
                <p className="pm-tag">
                  {DOMAIN_LABEL[cue.domain]} · {cue.year}
                </p>
                <h1 ref={titleRef} tabIndex={-1} className="pm-title pm-a-title">
                  {cue.name}
                </h1>
                <div className="pm-a-prompts">
                  <p className="pm-prompt">{cue.prompts[0]}</p>
                  <p className="pm-a-prompt2">
                    <span>Or try</span>
                    {cue.prompts[1]}
                  </p>
                </div>
                <details className="pm-details">
                  <summary>For you</summary>
                  <div className="pm-details-body">
                    <ForYou cue={cue} />
                  </div>
                </details>
                <div className="pm-a-stamps">
                  <ReactionRadios
                    cue={cue}
                    className="pm-reactions--stamp"
                    legend={`Log a Reaction for ${PERSON.name}`}
                    showClear
                  />
                </div>
              </article>
            ) : (
              <article className="pm-a-right">
                <span className="pm-a-folio" aria-hidden="true">
                  page {state.index + 1}
                </span>
                <p className="pm-tag">Sensory activity</p>
                <h1 ref={titleRef} tabIndex={-1} className="pm-title pm-a-title">
                  {sensory?.title}
                </h1>
                <p className="pm-a-sensory-steps">{sensory?.instruction}</p>
                <p className="pm-a-materials">
                  <strong>You will need:</strong> {sensory?.materials}
                </p>
                <p className="pm-a-note">
                  Nothing to log here. Notice how {PERSON.name} responds, then turn the page.
                </p>
              </article>
            )}
          </div>
        </main>

        <footer className="pm-bar">
          <button type="button" className="pm-btn pm-btn--ghost" disabled={isFirst} onClick={actions.back}>
            <ArrowIcon dir="left" /> Back
          </button>
          <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.skip}>
            Skip
          </button>
          <span className="pm-bar-spacer" />
          <button type="button" className="pm-btn" onClick={actions.next}>
            Next <ArrowIcon dir="right" />
          </button>
          <EndButton />
        </footer>
      </div>

      <SessionOverlays />
      <SessionStatus />
    </div>
  );
}
