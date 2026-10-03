"use client";

/**
 * PROTOTYPE, throwaway. Floating bottom-centre variant switcher (prototype skill, UI.md):
 * left arrow, "B (The Window)" label, right arrow. Updates `?variant=` with router.replace,
 * wraps around, and also answers to the Left/Right arrow keys unless a form control has focus.
 * Hidden in production builds. The "State" toggle prints the full in-memory Session state.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "./SessionContext";
import { VARIANT_KEYS, VARIANT_NAMES, type VariantKey } from "./variants";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  // Native radios use the arrow keys themselves (Reaction radiogroups), so leave those alone too.
  return target instanceof HTMLInputElement;
}

export function PrototypeSwitcher({ current }: { current: VariantKey }) {
  if (process.env.NODE_ENV === "production") return null;
  return <SwitcherBar current={current} />;
}

function SwitcherBar({ current }: { current: VariantKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const { state, counts, loggedCount } = useSession();
  const [showState, setShowState] = useState(false);

  useEffect(() => {
    function cycle(delta: number) {
      const index = VARIANT_KEYS.indexOf(current);
      const next = VARIANT_KEYS[(index + delta + VARIANT_KEYS.length) % VARIANT_KEYS.length];
      router.replace(`${pathname}?variant=${next}`, { scroll: false });
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowLeft") cycle(-1);
      else if (event.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, pathname, router]);

  function go(delta: number) {
    const index = VARIANT_KEYS.indexOf(current);
    const next = VARIANT_KEYS[(index + delta + VARIANT_KEYS.length) % VARIANT_KEYS.length];
    router.replace(`${pathname}?variant=${next}`, { scroll: false });
  }

  const snapshot = {
    variant: current,
    phase: state.phase,
    cueIndex: state.index,
    paused: state.paused,
    reactions: state.reactions,
    skipped: Object.keys(state.skipped),
    counts,
    loggedCount,
  };

  return (
    <nav className="pm-switcher" aria-label="Prototype variant switcher">
      {showState ? (
        <pre className="pm-switcher-state" id="pm-switcher-state">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      ) : null}
      <div className="pm-switcher-bar">
        <button type="button" className="pm-switcher-btn" onClick={() => go(-1)} aria-label="Previous variant">
          <span aria-hidden="true">&larr;</span>
        </button>
        <span className="pm-switcher-label" aria-live="polite">
          {current} ({VARIANT_NAMES[current]})
        </span>
        <button type="button" className="pm-switcher-btn" onClick={() => go(1)} aria-label="Next variant">
          <span aria-hidden="true">&rarr;</span>
        </button>
        <button
          type="button"
          className="pm-switcher-btn pm-switcher-btn--text"
          aria-expanded={showState}
          aria-controls="pm-switcher-state"
          onClick={() => setShowState((open) => !open)}
        >
          State
        </button>
      </div>
    </nav>
  );
}
