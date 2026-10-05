import "server-only";
import type { BudgetKind, CallBudget } from "./types";

/** Calls one Kit run may make to Qloo (PLAN 5.3), of which the agent's reserve is held back from prefetch. */
export const RUN_CALL_BUDGET = 16;
export const AGENT_RESERVE = 4;

/**
 * A per-run call budget (PLAN 5.3, NFR-11): `max` calls in total, with
 * `reserve.agent` of them kept for the agent's `expand_theme` and `rerank_cues`.
 * Prefetch can spend `max - reserve` and no more; the agent only its reserve.
 * Spending is synchronous, so concurrent callers can never overspend.
 */
export function createCallBudget(max: number, reserve: { readonly agent: number }): CallBudget {
  const { agent } = reserve;
  if (!Number.isInteger(max) || !Number.isInteger(agent) || max < 0 || agent < 0 || agent > max) {
    throw new RangeError("budget must be whole numbers, with 0 <= agent reserve <= max");
  }
  const capacity: Record<BudgetKind, number> = { prefetch: max - agent, agent };
  const spent: Record<BudgetKind, number> = { prefetch: 0, agent: 0 };

  return {
    take(kind) {
      if (spent[kind] >= capacity[kind]) return false;
      spent[kind] += 1;
      return true;
    },
    remaining: (kind) => capacity[kind] - spent[kind],
    used: () => ({ prefetch: spent.prefetch, agent: spent.agent }),
  };
}
