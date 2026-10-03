"use client";

/**
 * PROTOTYPE, throwaway. In-memory Session state shared by all variants, so a variant switch
 * keeps the same cue index and logged Reactions. Nothing is persisted.
 */

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { ITEMS, REACTION_ORDER, type Cue, type ReactionKey, type SessionItem } from "./fixture";

export type Phase = "running" | "wrapup" | "built";

export interface SessionState {
  readonly index: number;
  readonly phase: Phase;
  readonly dir: "fwd" | "back";
  readonly paused: boolean;
  readonly confirmEnd: boolean;
  readonly reactions: Readonly<Record<string, ReactionKey>>;
  readonly skipped: Readonly<Record<string, true>>;
}

type Action =
  | { type: "next" }
  | { type: "back" }
  | { type: "skip" }
  | { type: "goTo"; index: number }
  | { type: "react"; id: string; reaction: ReactionKey }
  | { type: "clear"; id: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "end" }
  | { type: "cancelEnd" }
  | { type: "confirmEnd" }
  | { type: "build" }
  | { type: "backToSession" }
  | { type: "restart" };

const LAST_INDEX = ITEMS.length - 1;

const INITIAL_STATE: SessionState = {
  index: 0,
  phase: "running",
  dir: "fwd",
  paused: false,
  confirmEnd: false,
  reactions: {},
  skipped: {},
};

function without<T>(record: Readonly<Record<string, T>>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "next":
      if (state.index >= LAST_INDEX) return { ...state, phase: "wrapup", dir: "fwd" };
      return { ...state, index: state.index + 1, dir: "fwd" };
    case "back":
      if (state.index === 0) return state;
      return { ...state, index: state.index - 1, dir: "back" };
    case "skip": {
      const item = ITEMS[state.index];
      const skipped: Record<string, true> =
        item.kind === "cue" ? { ...state.skipped, [item.id]: true } : { ...state.skipped };
      return reducer({ ...state, skipped }, { type: "next" });
    }
    case "goTo":
      return {
        ...state,
        index: action.index,
        dir: action.index >= state.index ? "fwd" : "back",
      };
    case "react":
      return {
        ...state,
        reactions: { ...state.reactions, [action.id]: action.reaction },
        skipped: without(state.skipped, action.id),
      };
    case "clear":
      return { ...state, reactions: without(state.reactions, action.id) };
    case "pause":
      return { ...state, paused: true };
    case "resume":
      return { ...state, paused: false };
    case "end":
      // UX 4.5: 0 Reactions asks first; 1 or more builds the next Kit with no modal.
      if (Object.keys(state.reactions).length === 0) return { ...state, confirmEnd: true };
      return { ...state, phase: "built", paused: false };
    case "cancelEnd":
      return { ...state, confirmEnd: false };
    case "confirmEnd":
      return { ...state, confirmEnd: false, phase: "wrapup" };
    case "build":
      return { ...state, phase: "built" };
    case "backToSession":
      return { ...state, phase: "running" };
    case "restart":
      return INITIAL_STATE;
    default:
      return state;
  }
}

export interface SessionActions {
  readonly next: () => void;
  readonly back: () => void;
  readonly skip: () => void;
  readonly goTo: (index: number) => void;
  readonly react: (id: string, reaction: ReactionKey) => void;
  readonly clear: (id: string) => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly endSession: () => void;
  readonly cancelEnd: () => void;
  readonly confirmEnd: () => void;
  readonly build: () => void;
  readonly backToSession: () => void;
  readonly restart: () => void;
}

export interface SessionApi {
  readonly state: SessionState;
  readonly items: readonly SessionItem[];
  readonly item: SessionItem;
  readonly total: number;
  readonly loggedCount: number;
  readonly overlayOpen: boolean;
  readonly counts: Readonly<Record<ReactionKey, number>>;
  readonly actions: SessionActions;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const actions = useMemo<SessionActions>(
    () => ({
      next: () => dispatch({ type: "next" }),
      back: () => dispatch({ type: "back" }),
      skip: () => dispatch({ type: "skip" }),
      goTo: (index) => dispatch({ type: "goTo", index }),
      react: (id, reaction) => dispatch({ type: "react", id, reaction }),
      clear: (id) => dispatch({ type: "clear", id }),
      pause: () => dispatch({ type: "pause" }),
      resume: () => dispatch({ type: "resume" }),
      endSession: () => dispatch({ type: "end" }),
      cancelEnd: () => dispatch({ type: "cancelEnd" }),
      confirmEnd: () => dispatch({ type: "confirmEnd" }),
      build: () => dispatch({ type: "build" }),
      backToSession: () => dispatch({ type: "backToSession" }),
      restart: () => dispatch({ type: "restart" }),
    }),
    [],
  );

  const api = useMemo<SessionApi>(() => {
    const counts: Record<ReactionKey, number> = { engaged: 0, neutral: 0, distressed: 0 };
    for (const key of REACTION_ORDER) {
      counts[key] = Object.values(state.reactions).filter((value) => value === key).length;
    }
    return {
      state,
      items: ITEMS,
      item: ITEMS[state.index],
      total: ITEMS.length,
      loggedCount: Object.keys(state.reactions).length,
      overlayOpen: state.paused || state.confirmEnd || state.phase !== "running",
      counts,
      actions,
    };
  }, [state, actions]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

export function isCue(item: SessionItem): item is Cue {
  return item.kind === "cue";
}
