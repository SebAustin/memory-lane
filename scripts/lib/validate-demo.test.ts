import { describe, expect, it } from "vitest";
import { renderValidateDemo } from "./validate-demo";

describe("renderValidateDemo", () => {
  const report = renderValidateDemo();

  it("lists the rogue draft, the drops and repairs by reason, and the compliant Kit", () => {
    expect(report).toContain("ROGUE DRAFT");
    expect(report).toContain("fx-film-invented-by-the-model");
    for (const reason of ["not_in_registry", "excluded_entity", "outside_window", "avoid_topic_name"]) {
      expect(report).toContain(reason);
    }
    expect(report).toContain("COMPLIANT KIT");
    expect(report).toContain("Saturday Night at the Pictures, 1962");
  });

  it("shows the compliant Kit without the rogue ids or the claim words", () => {
    const kitPart = report.slice(report.indexOf("COMPLIANT KIT"));
    expect(kitPart).not.toContain("fx-film-invented-by-the-model");
    expect(kitPart).not.toContain("improves memory");
    expect(kitPart).not.toContain("Tennessee Waltz");
  });

  it("proves a second pass makes no change", () => {
    expect(report).toContain("SECOND PASS: 0 drops, 0 repairs (idempotent)");
  });
});
