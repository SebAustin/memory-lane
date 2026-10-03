"use client";

/**
 * PROTOTYPE, throwaway. Pause, "End this Session?" confirm, wrap-up ("How did it go?") and the
 * stubbed "next Kit would build here" screen. Shared by all variants so the comparison stays on the
 * main Session screen. All four are modal dialogs: focus is trapped, Esc leaves, focus is restored.
 */

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { CALMING, CUES, PERSON, REACTIONS, SAFETY_FULL } from "./fixture";
import { useSession } from "./SessionContext";
import { CuePicture, ReactionChip, ReactionRadios } from "./shared";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useModalFocus(ref: RefObject<HTMLElement | null>, onEscape: () => void): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
    (node.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [ref, onEscape]);
}

interface OverlayProps {
  kind: "pause" | "confirm" | "wrapup" | "built";
  titleId: string;
  onEscape: () => void;
  children: ReactNode;
}

function Overlay({ kind, titleId, onEscape, children }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocus(ref, onEscape);
  return (
    <div className="pm-overlay" data-kind={kind}>
      <div ref={ref} className="pm-overlay-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {children}
      </div>
    </div>
  );
}

function PauseOverlay() {
  const { actions } = useSession();
  const titleId = useId();
  return (
    <Overlay kind="pause" titleId={titleId} onEscape={actions.resume}>
      <p className="pm-overlay-eyebrow">Paused</p>
      <h2 id={titleId} className="pm-overlay-title">
        Take a breath together.
      </h2>
      <p className="pm-overlay-lede">Nothing is timed. Resume when {PERSON.name} is ready.</p>
      <div className="pm-calm">
        <CuePicture item={{ monogram: CALMING.monogram, hue: CALMING.hue, domain: "artist" }} className="pm-calm-pic" />
        <div>
          <p className="pm-calm-label">A calming Learned Favorite</p>
          <p className="pm-calm-name">{CALMING.name}</p>
          <p className="pm-calm-note">{CALMING.note}</p>
        </div>
      </div>
      <div className="pm-overlay-actions">
        <button type="button" data-autofocus className="pm-btn pm-btn--accent pm-btn--lg" onClick={actions.resume}>
          Resume Session
        </button>
      </div>
    </Overlay>
  );
}

function EndConfirm() {
  const { actions } = useSession();
  const titleId = useId();
  return (
    <Overlay kind="confirm" titleId={titleId} onEscape={actions.cancelEnd}>
      <h2 id={titleId} className="pm-overlay-title">
        End this Session?
      </h2>
      <p className="pm-overlay-lede">No Reactions are logged yet, so there is nothing to build the next Kit from.</p>
      <p className="pm-safety">{SAFETY_FULL}</p>
      <div className="pm-overlay-actions">
        <button type="button" data-autofocus className="pm-btn pm-btn--solid" onClick={actions.cancelEnd}>
          Keep going
        </button>
        <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.confirmEnd}>
          End Session
        </button>
      </div>
    </Overlay>
  );
}

function WrapUp() {
  const { state, counts, loggedCount, actions } = useSession();
  const titleId = useId();
  const notLogged = CUES.length - loggedCount;
  return (
    <Overlay kind="wrapup" titleId={titleId} onEscape={actions.backToSession}>
      <h2 id={titleId} className="pm-overlay-title">
        How did it go?
      </h2>
      <p className="pm-overlay-lede">
        Engaged Cues become Learned Favorites. Distressed Cues are left out next time.
      </p>
      <p className="pm-wrap-summary" role="status">
        {counts.engaged} {REACTIONS.engaged.label} · {counts.neutral} {REACTIONS.neutral.label} · {counts.distressed}{" "}
        {REACTIONS.distressed.label} · {notLogged} not logged
      </p>
      <ul className="pm-wrap-list">
        {CUES.map((cue) => (
          <li key={cue.id} className="pm-wrap-row">
            <div className="pm-wrap-name">
              <span>{cue.name}</span>
              <ReactionChip reaction={state.reactions[cue.id]} skipped={Boolean(state.skipped[cue.id])} />
            </div>
            <ReactionRadios cue={cue} className="pm-reactions--compact pm-wrap" />
          </li>
        ))}
      </ul>
      <div className="pm-overlay-actions">
        <button type="button" data-autofocus className="pm-btn pm-btn--accent pm-btn--lg" onClick={actions.build}>
          Build next Kit
        </button>
        <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.backToSession}>
          Back to the Session
        </button>
      </div>
    </Overlay>
  );
}

function BuiltStub() {
  const { state, actions } = useSession();
  const titleId = useId();
  const favorites = CUES.filter((cue) => state.reactions[cue.id] === "engaged");
  const exclusions = CUES.filter((cue) => state.reactions[cue.id] === "distressed");
  const rest = CUES.filter((cue) => state.reactions[cue.id] === "neutral" || !state.reactions[cue.id]);
  const names = (list: readonly { name: string }[], empty: string) =>
    list.length > 0 ? list.map((cue) => cue.name).join(", ") : empty;
  return (
    <Overlay kind="built" titleId={titleId} onEscape={actions.backToSession}>
      <p className="pm-overlay-eyebrow">Prototype stub</p>
      <h2 id={titleId} className="pm-overlay-title">
        Building {PERSON.name}&apos;s next Kit
      </h2>
      <p className="pm-overlay-lede">
        In the real app this saves the Session Log and opens Kit v2. This is what it would send.
      </p>
      <dl className="pm-built">
        <div>
          <dt>Using {favorites.length} Learned Favorites as new Seeds</dt>
          <dd>{names(favorites, "None yet. Engaged Cues become Learned Favorites.")}</dd>
        </div>
        <div>
          <dt>Leaving out {exclusions.length} as Exclusions</dt>
          <dd>{names(exclusions, "None. No Cue was Distressed.")}</dd>
        </div>
        <div>
          <dt>No change</dt>
          <dd>{names(rest, "None.")}</dd>
        </div>
      </dl>
      <div className="pm-overlay-actions">
        <button type="button" data-autofocus className="pm-btn pm-btn--solid" onClick={actions.backToSession}>
          Back to the Session
        </button>
        <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.restart}>
          Start over
        </button>
      </div>
    </Overlay>
  );
}

export function SessionOverlays() {
  const { state } = useSession();
  return (
    <>
      {state.paused ? <PauseOverlay /> : null}
      {state.confirmEnd ? <EndConfirm /> : null}
      {state.phase === "wrapup" ? <WrapUp /> : null}
      {state.phase === "built" ? <BuiltStub /> : null}
    </>
  );
}
