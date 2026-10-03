"use client";

/**
 * PROTOTYPE, throwaway. Small primitives reused by all three variants: glyphs, the CSS-drawn
 * placeholder picture, the Reaction radiogroup, the Distressed banner and a live status line.
 * Layout is NOT shared: each variant owns its own structure.
 */

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import {
  PERSON,
  REACTIONS,
  REACTION_ORDER,
  SAFETY_FULL,
  affinityBand,
  itemTitle,
  type Cue,
  type Domain,
  type ReactionKey,
} from "./fixture";
import { useSession } from "./SessionContext";

/* ---------- glyphs ---------- */

export function ReactionGlyph({ reaction, size = 32 }: { reaction: ReactionKey; size?: number }) {
  const mouth =
    reaction === "engaged"
      ? "M10 18.5 Q16 25 22 18.5"
      : reaction === "neutral"
        ? "M11 21 H21"
        : "M10.5 23 Q16 17.5 21.5 23";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="13" />
      <circle cx="11.5" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <path d={mouth} />
    </svg>
  );
}

export function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function PauseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="5" y="4" width="5" height="16" rx="1.5" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" />
    </svg>
  );
}

export function ArrowIcon({ dir, size = 22 }: { dir: "left" | "right"; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/* ---------- CSS-drawn placeholder picture (no real images) ---------- */

function Motif({ domain }: { domain: Domain | "sensory" }) {
  const common = {
    viewBox: "0 0 100 100",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "pm-pic-motif",
    "aria-hidden": true,
    focusable: "false" as const,
  };
  switch (domain) {
    case "artist":
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="46" />
          <circle cx="50" cy="50" r="34" />
          <circle cx="50" cy="50" r="22" />
          <circle cx="50" cy="50" r="8" />
        </svg>
      );
    case "film":
      return (
        <svg {...common}>
          <rect x="8" y="22" width="84" height="56" rx="4" />
          <path d="M8 34h84M8 66h84" />
          <path d="M18 22v12M32 22v12M46 22v12M60 22v12M74 22v12M18 66v12M32 66v12M46 66v12M60 66v12M74 66v12" />
        </svg>
      );
    case "tv":
      return (
        <svg {...common}>
          <rect x="10" y="28" width="80" height="54" rx="8" />
          <rect x="18" y="36" width="48" height="38" rx="4" />
          <path d="M32 28L20 12M68 28L80 12M76 46h6M76 56h6" />
        </svg>
      );
    case "dish":
      return (
        <svg {...common}>
          <path d="M8 50h84c0 22-18 38-42 38S8 72 8 50z" />
          <path d="M36 38c-5-5 5-9 0-14M50 38c-5-5 5-9 0-14M64 38c-5-5 5-9 0-14" />
        </svg>
      );
    case "brand":
      return (
        <svg {...common}>
          <polygon points="50,6 61,36 93,37 68,57 77,89 50,70 23,89 32,57 7,37 39,36" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="44" />
          <circle cx="50" cy="50" r="30" />
          <circle cx="50" cy="50" r="16" />
        </svg>
      );
  }
}

interface CuePictureProps {
  /** A Cue, a sensory activity, or anything with a monogram and hue. No domain means "sensory". */
  item: { readonly monogram: string; readonly hue: number; readonly domain?: Domain };
  /** Fill the parent (absolute) instead of using a 4:3 box. */
  fill?: boolean;
  className?: string;
}

export function CuePicture({ item, fill = false, className = "" }: CuePictureProps) {
  const domain: Domain | "sensory" = item.domain ?? "sensory";
  const style = { "--hue": item.hue } as CSSProperties;
  return (
    <div className={`pm-pic ${fill ? "pm-pic--fill" : ""} ${className}`} style={style} aria-hidden="true">
      <Motif domain={domain} />
      <span className="pm-pic-monogram">{item.monogram}</span>
    </div>
  );
}

/* ---------- Reaction radiogroup (native radios: arrow keys work for free) ---------- */

interface ReactionRadiosProps {
  cue: Cue;
  className?: string;
  /** Visible legend. When omitted a screen-reader-only legend is used. */
  legend?: string;
  showClear?: boolean;
}

export function ReactionRadios({ cue, className = "", legend, showClear = false }: ReactionRadiosProps) {
  const { state, actions } = useSession();
  const value = state.reactions[cue.id];
  return (
    <fieldset className={`pm-reactions ${className}`}>
      <legend className={legend ? "pm-reactions-legend" : "pm-sr"}>
        {legend ?? `How did ${PERSON.name} react to ${cue.name}?`}
      </legend>
      {REACTION_ORDER.map((key) => {
        const checked = value === key;
        return (
          <label key={key} className="pm-react" data-reaction={key} data-checked={checked}>
            <input
              type="radio"
              name={`reaction-${cue.id}-${className || "main"}`}
              value={key}
              checked={checked}
              onChange={() => actions.react(cue.id, key)}
            />
            <ReactionGlyph reaction={key} />
            <span className="pm-react-label">{REACTIONS[key].label}</span>
            <span className="pm-react-check" aria-hidden="true">
              <CheckIcon size={18} />
            </span>
          </label>
        );
      })}
      {showClear && value ? (
        <button type="button" className="pm-clear" onClick={() => actions.clear(cue.id)}>
          Clear Reaction<span className="pm-sr"> for {cue.name}</span>
        </button>
      ) : null}
    </fieldset>
  );
}

/** Status chip: glyph plus label plus colour, never colour alone. */
export function ReactionChip({ reaction, skipped = false }: { reaction?: ReactionKey; skipped?: boolean }) {
  if (reaction) {
    return (
      <span className="pm-chip" data-reaction={reaction}>
        <ReactionGlyph reaction={reaction} size={20} />
        {REACTIONS[reaction].label}
      </span>
    );
  }
  return <span className="pm-chip pm-chip--none">{skipped ? "Skipped" : "Not logged yet"}</span>;
}

/* ---------- Distressed banner (UX 4.6): persistent, with Undo ---------- */

export function DistressBanner({ cue, className = "" }: { cue: Cue; className?: string }) {
  const { state, actions } = useSession();
  if (state.reactions[cue.id] !== "distressed") return null;
  return (
    <div className={`pm-banner ${className}`} role="alert" data-reaction="distressed">
      <ReactionGlyph reaction="distressed" size={36} />
      <div className="pm-banner-text">
        <p className="pm-banner-title">That&apos;s okay. Let&apos;s pause.</p>
        <p className="pm-banner-sub">We&apos;ll leave this out from now on.</p>
      </div>
      <div className="pm-banner-actions">
        <button type="button" className="pm-btn pm-btn--solid" onClick={actions.pause}>
          Switch to something calming
        </button>
        <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.skip}>
          Skip this one
        </button>
        <button type="button" className="pm-btn pm-btn--ghost" onClick={actions.endSession}>
          End Session
        </button>
        <button type="button" className="pm-btn pm-btn--ghost" onClick={() => actions.clear(cue.id)}>
          Undo
        </button>
      </div>
    </div>
  );
}

/* ---------- End button: label follows the Reaction count (UX 4.5) ---------- */

export function EndButton({ className = "" }: { className?: string }) {
  const { loggedCount, actions } = useSession();
  return (
    <button type="button" className={`pm-btn pm-btn--accent pm-bar-end ${className}`} onClick={actions.endSession}>
      {loggedCount >= 1 ? "End & build next Kit" : "End Session"}
    </button>
  );
}

/* ---------- "For you" body: tips, Provenance and the safety line ---------- */

export function ForYou({ cue }: { cue: Cue }) {
  return (
    <>
      <p>
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
      <p>
        <strong>Tip:</strong> {cue.tip}
      </p>
      <p className="pm-safety">{SAFETY_FULL}</p>
    </>
  );
}

/* ---------- Affinity (UX 6.1: meter plus a word band) ---------- */

export function Affinity({ cue }: { cue: Cue }) {
  const percent = Math.round(cue.affinity * 100);
  return (
    <div className="pm-affinity">
      <meter
        min={0}
        max={100}
        value={percent}
        aria-label={`Affinity ${percent} out of 100`}
        aria-describedby={`aff-note-${cue.id}`}
      />
      <span className="pm-affinity-text">
        <strong>{affinityBand(cue.affinity)}</strong> · {cue.affinity.toFixed(2)}
      </span>
      <span id={`aff-note-${cue.id}`} className="pm-affinity-note">
        It describes groups, not {PERSON.name}.
      </span>
    </div>
  );
}

/* ---------- live status (screen readers) ---------- */

export function SessionStatus() {
  const { state, item, total } = useSession();
  const reaction = item.kind === "cue" ? state.reactions[item.id] : undefined;
  let text: string;
  if (state.phase === "wrapup") text = "Session finished. Review the Reactions.";
  else if (state.phase === "built") text = "Next Kit would build now. This is a prototype stub.";
  else {
    const label = item.kind === "cue" ? "Cue" : "Sensory activity";
    text = `${label} ${state.index + 1} of ${total}: ${itemTitle(item)}.`;
    if (reaction) text += ` Logged: ${REACTIONS[reaction].label}.`;
  }
  return (
    <p className="pm-sr" role="status" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
}

/* ---------- focus: Cue title takes focus when the screen changes (UX 9) ---------- */

export function useTitleFocus<T extends HTMLElement>(key: string): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [key]);
  return ref;
}
