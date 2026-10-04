import { describe, expect, it } from "vitest";
import { detectPiiRisk, type PiiKind } from "./pii";

const kindsOf = (text: string, only?: readonly PiiKind[]) =>
  detectPiiRisk(text, only === undefined ? undefined : { kinds: only }).map((f) => f.kind);

describe("detectPiiRisk: surname-like", () => {
  it.each([
    ["a first and last name", "Margaret Smith"],
    ["a name with a particle", "Margaret O'Brien"],
    ["a hyphenated surname", "Margaret Smith-Jones"],
    ["a title and surname", "Mrs. Johnson"],
    ["a title with no dot", "Dr Patel"],
    ["a first name and an initial", "Margaret S."],
    ["a name inside a sentence", "She is Margaret Smith from Memphis"],
    ["accented capitals", "José García"],
  ])("flags %s", (_label, text) => {
    expect(kindsOf(text)).toContain("surname");
  });

  it.each([
    ["a single first name", "Margaret"],
    ["a name with an apostrophe", "O'Brien"],
    ["a hyphenated first name", "Mary-Ann"],
    ["lower-case words", "she grew up on a farm"],
    ["a single capital in a sentence", "She loved to dance"],
    ["empty text", ""],
    ["only whitespace", "   "],
  ])("leaves %s alone", (_label, text) => {
    expect(kindsOf(text)).not.toContain("surname");
  });
});

describe("detectPiiRisk: address-like", () => {
  it.each([
    ["a street address", "123 Main Street"],
    ["an abbreviated street", "42 Elm Rd"],
    ["a numbered avenue", "1600 Pennsylvania Ave."],
    ["a PO box", "P.O. Box 1234"],
    ["a PO box, plain", "PO Box 77"],
    ["an apartment", "Apt 4B"],
    ["a unit number", "Unit 12"],
    ["a care-home room", "Room 214"],
    ["a US ZIP code", "Memphis, TN 38104"],
    ["a ZIP+4", "38104-2217"],
    ["a UK postcode", "SW1A 1AA"],
  ])("flags %s", (_label, text) => {
    expect(kindsOf(text)).toContain("address");
  });

  it.each([
    ["a city", "Memphis"],
    ["a city and state", "Memphis, Tennessee"],
    ["a decade", "the 1950s"],
    ["a year", "1956"],
    ["a street name with no number", "Beale Street"],
    ["a short number", "Route 66"],
  ])("leaves %s alone", (_label, text) => {
    expect(kindsOf(text)).not.toContain("address");
  });
});

describe("detectPiiRisk: diagnosis-like", () => {
  it.each([
    ["dementia", "She has dementia"],
    ["Alzheimer's", "Alzheimer's disease"],
    ["Alzheimers, no apostrophe", "alzheimers"],
    ["Parkinson's", "Parkinson's"],
    ["a stroke", "had a stroke last year"],
    ["Lewy body", "Lewy body dementia"],
    ["diagnosed", "diagnosed in 2019"],
    ["an abbreviation", "COPD"],
    ["a mood disorder", "depression and anxiety"],
  ])("flags %s", (_label, text) => {
    expect(kindsOf(text)).toContain("diagnosis");
  });

  it.each([
    ["a hobby", "she loved gardening"],
    ["an occupation", "school nurse"],
    ["a word that only contains one", "strokes of the paintbrush"],
    ["a longer word", "predementiaville"],
  ])("leaves %s alone", (_label, text) => {
    expect(kindsOf(text)).not.toContain("diagnosis");
  });
});

describe("detectPiiRisk: shape of the result", () => {
  it("reports what matched and where, in reading order", () => {
    const findings = detectPiiRisk("Margaret Smith, 12 Oak Street, has dementia");

    expect(findings.map((f) => f.kind)).toEqual(["surname", "address", "diagnosis"]);
    expect(findings[0]).toMatchObject({ match: "Margaret Smith", index: 0 });
  });

  it("reports one finding per kind of risk, so the Caregiver sees one calm hint each", () => {
    const findings = detectPiiRisk("Margaret Smith and John Doe");

    expect(findings.filter((f) => f.kind === "surname")).toHaveLength(1);
  });

  it("only looks for the kinds a field asks for", () => {
    const text = "Memphis Tennessee, has dementia";

    expect(kindsOf(text, ["address", "diagnosis"])).toEqual(["diagnosis"]);
    expect(kindsOf(text, ["surname"])).toEqual(["surname"]);
  });

  it("returns an empty list for ordinary text", () => {
    expect(detectPiiRisk("grew up on the river")).toEqual([]);
  });

  it("copes with long input without slowing down", () => {
    const long = "Aaaa ".repeat(2000) + "1".repeat(5000);
    const start = Date.now();

    detectPiiRisk(long);

    expect(Date.now() - start).toBeLessThan(500);
  });
});
