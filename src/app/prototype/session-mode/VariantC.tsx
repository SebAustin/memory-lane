"use client";

/**
 * PROTOTYPE, throwaway. Variant C: "Run of Show" (UX 10.C).
 * Idea: a Caregiver console. A running order on the left shows every Cue and its Reaction, Prompts are a
 * checklist, and "Show to the Person" swaps in a clean, large view while Reactions stay in the bottom bar.
 * Best for coordinators and therapists who run the Session and need to see the whole shape of it.
 */

import { useState } from "react";
import { CUES, PERSON, SAFETY_FULL, SESSION_META, itemKindLabel, itemTitle } from "./fixture";
import { useSession } from "./SessionContext";
import { SessionOverlays } from "./SessionOverlays";
import {
  Affinity,
  ArrowIcon,
  CheckIcon,
  CuePicture,
  DistressBanner,
  EndButton,
  PauseIcon,
  ReactionChip,
  ReactionRadios,
  SessionStatus,
  useTitleFocus,
} from "./shared";

export function VariantC() {
  const { state, items, item, total, loggedCount, overlayOpen, actions } = useSession();
  const titleRef = useTitleFocus<HTMLHeadingElement>(item.id);
  const [asked, setAsked] = useState<Readonly<Record<string, true>>>({});
  const [presenting, setPresenting] = useState(false);
  const cue = item.kind === "cue" ? item : null;
  const sensory = item.kind === "sensory" ? item : null;
  const reaction = cue ? state.reactions[cue.id] : undefined;
  const isFirst = state.index === 0;
  // A Distressed Reaction always brings the Caregiver back to the console (and its banner).
  const showPerson = presenting && reaction !== "distressed";

  function toggleAsked(key: string) {
    setAsked((current) => {
      if (current[key]) return Object.fromEntries(Object.entries(current).filter(([k]) => k !== key));
      return { ...current, [key]: true };
    });
  }

  return (
    <div className="pm-shell">
      <div className="pm-body pm-c" inert={overlayOpen}>
        <header className="pm-c-top">
          <div className="pm-c-meta">
            <p className="pm-c-meta-title">
              Session {SESSION_META.number}: {SESSION_META.title}
            </p>
            <p className="pm-c-meta-sub">
              {PERSON.name}, b. {PERSON.born} · {PERSON.hometown} · {PERSON.stage} stage · {SESSION_META.minutes} min
            </p>
            <p className="pm-c-meta-sub">
              Step {state.index + 1} of {total} · {loggedCount} of {CUES.length} Reactions logged
            </p>
          </div>
          <button
            type="button"
            className="pm-btn pm-btn--ghost"
            onClick={() => setPresenting((open) => !open)}
          >
            {showPerson ? "Back to console" : "Show to the Person"}
          </button>
          <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.pause}>
            <PauseIcon /> Pause
          </button>
        </header>

        {showPerson ? (
          <main className="pm-c-present" key={item.id}>
            <div className="pm-a-mat">
              <CuePicture item={item} />
            </div>
            <div className="pm-c-present-text">
              <h1 ref={titleRef} tabIndex={-1} className="pm-title">
                {itemTitle(item)}
              </h1>
              <p className="pm-prompt">{cue ? cue.prompts[0] : sensory?.instruction}</p>
            </div>
          </main>
        ) : (
          <div className="pm-c-grid">
            <nav className="pm-c-order" aria-label="Running order">
              <h2 className="pm-c-heading">Running order</h2>
              <ol className="pm-c-steps">
                {items.map((it, index) => {
                  const itReaction = it.kind === "cue" ? state.reactions[it.id] : undefined;
                  const current = index === state.index;
                  return (
                    <li key={it.id} className="pm-c-step-item">
                      <button
                        type="button"
                        className="pm-c-step"
                        aria-current={current ? "step" : undefined}
                        onClick={() => actions.goTo(index)}
                      >
                        <span className="pm-c-step-num" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span className="pm-c-step-name">{itemTitle(it)}</span>
                        <span className="pm-c-step-meta">
                          {it.kind === "cue" ? (
                            <ReactionChip
                              reaction={itReaction}
                              skipped={Boolean(state.skipped[it.id])}
                            />
                          ) : (
                            <span>{itemKindLabel(it)}</span>
                          )}
                          {current ? <span className="pm-c-step-now">Now</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <main className="pm-c-main">
              {cue ? <DistressBanner cue={cue} /> : null}

              <section className="pm-c-card" aria-labelledby="pm-c-title">
                <p className="pm-tag">
                  {itemKindLabel(item)}
                  {cue ? ` · ${cue.year}` : ""}
                </p>
                <h1 id="pm-c-title" ref={titleRef} tabIndex={-1} className="pm-title pm-c-title">
                  {itemTitle(item)}
                </h1>
                {cue ? <p className="pm-c-sub">{cue.detail}</p> : <p className="pm-c-sub">{sensory?.materials}</p>}

                {cue ? (
                  <fieldset className="pm-c-checklist">
                    <legend>Prompts to try</legend>
                    {cue.prompts.map((prompt, index) => {
                      const key = `${cue.id}:${index}`;
                      const isAsked = Boolean(asked[key]);
                      return (
                        <label key={key} className="pm-check-row" data-asked={isAsked}>
                          <input type="checkbox" checked={isAsked} onChange={() => toggleAsked(key)} />
                          <span className="pm-check-row-text">{prompt}</span>
                          <span className="pm-check-row-state">
                            {isAsked ? (
                              <>
                                <CheckIcon size={16} /> Asked
                              </>
                            ) : (
                              "Not asked"
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                ) : (
                  <p className="pm-prompt">{sensory?.instruction}</p>
                )}
              </section>

              {cue ? (
                <section className="pm-c-card" aria-label="Why this?">
                  <p className="pm-c-sub">
                    <strong>Why this?</strong> {cue.whyThis}
                  </p>
                  <Affinity cue={cue} />
                  <ul className="pm-signals" aria-label="Signals behind this Cue">
                    {cue.signals.map((signal) => (
                      <li key={signal} className="pm-signal">
                        {signal}
                      </li>
                    ))}
                  </ul>
                  <p className="pm-c-sub">
                    <strong>Tip:</strong> {cue.tip}
                  </p>
                  <p className="pm-safety">{SAFETY_FULL}</p>
                </section>
              ) : null}
            </main>

            <aside className="pm-c-preview" aria-label="What the Person sees">
              <div className="pm-c-preview-card">
                <h2 className="pm-c-heading">What {PERSON.name} sees</h2>
                <div className="pm-c-preview-frame">
                  <CuePicture item={item} />
                  <p className="pm-c-preview-name">{itemTitle(item)}</p>
                  <p className="pm-c-preview-prompt">{cue ? cue.prompts[0] : sensory?.title}</p>
                </div>
                <button type="button" className="pm-btn pm-btn--accent" onClick={() => setPresenting(true)}>
                  Show to the Person
                </button>
              </div>
            </aside>
          </div>
        )}

        <footer className="pm-bar">
          <button type="button" className="pm-btn pm-btn--ghost" disabled={isFirst} onClick={actions.back}>
            <ArrowIcon dir="left" /> Back
          </button>
          <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.skip}>
            Skip
          </button>
          {cue ? (
            <ReactionRadios cue={cue} className="pm-reactions--bar" />
          ) : (
            <p className="pm-bar-note">Sensory activity. Nothing to log.</p>
          )}
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
