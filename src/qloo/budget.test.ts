import { describe, expect, it } from "vitest";
import { createCallBudget } from "@/qloo/budget";

describe("createCallBudget(16, { agent: 4 })", () => {
  it("lets prefetch spend 12 calls and never the agent reserve", () => {
    const budget = createCallBudget(16, { agent: 4 });

    const granted = Array.from({ length: 20 }, () => budget.take("prefetch")).filter(Boolean);

    expect(granted).toHaveLength(12);
    expect(budget.remaining("prefetch")).toBe(0);
    expect(budget.remaining("agent")).toBe(4);
  });

  it("keeps the reserve for the agent after prefetch is spent", () => {
    const budget = createCallBudget(16, { agent: 4 });
    for (let i = 0; i < 12; i += 1) budget.take("prefetch");

    const granted = Array.from({ length: 6 }, () => budget.take("agent")).filter(Boolean);

    expect(granted).toHaveLength(4);
    expect(budget.used()).toEqual({ prefetch: 12, agent: 4 });
  });

  it("does not let the agent spend prefetch calls either", () => {
    const budget = createCallBudget(16, { agent: 4 });
    for (let i = 0; i < 4; i += 1) budget.take("agent");
    expect(budget.take("agent")).toBe(false);
    expect(budget.remaining("prefetch")).toBe(12);
  });

  it("reports what was spent", () => {
    const budget = createCallBudget(16, { agent: 4 });
    budget.take("prefetch");
    budget.take("prefetch");
    budget.take("agent");
    expect(budget.used()).toEqual({ prefetch: 2, agent: 1 });
  });

  it("works with no reserve", () => {
    const budget = createCallBudget(2, { agent: 0 });
    expect([budget.take("prefetch"), budget.take("prefetch"), budget.take("prefetch")]).toEqual([true, true, false]);
    expect(budget.take("agent")).toBe(false);
  });

  it.each([
    [-1, 0],
    [16, 17],
    [1.5, 0],
    [16, -1],
  ])("rejects a nonsensical budget (%s, reserve %s)", (max, agent) => {
    expect(() => createCallBudget(max, { agent })).toThrow(RangeError);
  });
});
