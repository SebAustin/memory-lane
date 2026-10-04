import { describe, expect, it } from "vitest";
import {
  EMPTY_FORM,
  firstReachableStep,
  formFromDraft,
  maxReachableStep,
  mergeStepValues,
  validateLaterStep,
  parseStepFields,
  parseStepParam,
  previewWindow,
  type FormValues,
} from "./form";

const form = (patch: Partial<FormValues>): FormValues => ({ ...EMPTY_FORM, ...patch });

describe("step 1: About them", () => {
  it("accepts a first name and a birth year, and gives back clean values", () => {
    const result = parseStepFields(1, form({ firstName: "  Margaret ", birthYear: "1946" }));

    expect(result).toEqual({ values: { firstName: "Margaret", birthYear: 1946 }, errors: {} });
  });

  it("normalizes typographic apostrophes in the name", () => {
    const result = parseStepFields(1, form({ firstName: "O’Brien", birthYear: "1946" }));

    expect(result.values.firstName).toBe("O'Brien");
  });

  it.each([
    ["", "Enter their first name."],
    ["   ", "Enter their first name."],
    ["Margaret2", "Use letters, apostrophes and hyphens only."],
    ["Mar@ret", "Use letters, apostrophes and hyphens only."],
    ["A".repeat(31), "Keep this to 30 characters or fewer."],
  ])("explains a bad first name %j in plain words", (firstName, message) => {
    const result = parseStepFields(1, form({ firstName, birthYear: "1946" }));

    expect(result.errors.firstName).toBe(message);
    expect(result.values.firstName).toBeUndefined();
  });

  it.each([
    ["", "Enter the year they were born."],
    ["abc", "Use a four-digit year, like 1946."],
    ["46", "Use a four-digit year, like 1946."],
    ["19.5", "Use a four-digit year, like 1946."],
    ["1919", "Birth year needs to be between 1920 and 1975."],
    ["1976", "Birth year needs to be between 1920 and 1975."],
  ])("explains a bad birth year %j in plain words", (birthYear, message) => {
    const result = parseStepFields(1, form({ firstName: "Margaret", birthYear }));

    expect(result.errors.birthYear).toBe(message);
  });

  it.each(["1920", "1975"])("accepts the edge birth year %s (FR-7)", (birthYear) => {
    expect(parseStepFields(1, form({ firstName: "Ann", birthYear })).errors).toEqual({});
  });

  it("keeps the valid field when the other one is wrong", () => {
    const result = parseStepFields(1, form({ firstName: "Margaret", birthYear: "nope" }));

    expect(result.values).toEqual({ firstName: "Margaret" });
    expect(Object.keys(result.errors)).toEqual(["birthYear"]);
  });
});

describe("step 2: Places", () => {
  it("needs a Hometown, and the other two places are optional", () => {
    const result = parseStepFields(2, form({ hometown: "Memphis" }));

    expect(result).toEqual({ values: { hometown: "Memphis" }, errors: {} });
  });

  it("asks for the Hometown in plain words", () => {
    expect(parseStepFields(2, form({})).errors.hometown).toBe("Enter where they grew up.");
    expect(parseStepFields(2, form({ hometown: "M" })).errors.hometown).toBe("Use at least 2 letters.");
    expect(parseStepFields(2, form({ hometown: "M".repeat(81) })).errors.hometown).toBe(
      "Keep this to 80 characters or fewer.",
    );
  });

  it("checks an optional place only when something was typed", () => {
    const result = parseStepFields(2, form({ hometown: "Memphis", youngAdultCity: "N", careLocation: "  " }));

    expect(result.errors).toEqual({ youngAdultCity: "Use at least 2 letters." });
    expect(result.values).toEqual({ hometown: "Memphis" });
  });
});

describe("step 3: Roots", () => {
  it("accepts an empty step, because every field is optional", () => {
    expect(parseStepFields(3, form({}))).toEqual({ values: {}, errors: {} });
  });

  it("keeps trimmed text and the shared length limits", () => {
    const result = parseStepFields(
      3,
      form({ heritage: " Irish ", language: "L".repeat(41), occupation: "Seamstress" }),
    );

    expect(result.values).toEqual({ heritage: "Irish", occupation: "Seamstress" });
    expect(result.errors.language).toBe("Keep this to 40 characters or fewer.");
  });
});

describe("steps without fields yet", () => {
  it.each([4, 5, 6])("step %i has nothing to validate in this ticket", (step) => {
    expect(parseStepFields(step, EMPTY_FORM)).toEqual({ values: {}, errors: {} });
  });
});

describe("draft to form and back", () => {
  it("fills the form from a saved draft, with numbers as text", () => {
    expect(formFromDraft({ firstName: "Margaret", birthYear: 1946, hometown: "Memphis" })).toEqual(
      form({ firstName: "Margaret", birthYear: "1946", hometown: "Memphis" }),
    );
  });

  it("starts with an empty form when there is no draft", () => {
    expect(formFromDraft(undefined)).toEqual(EMPTY_FORM);
  });

  it("merges a step's values without keeping what the Caregiver cleared", () => {
    const merged = mergeStepValues({ firstName: "Margaret", heritage: "Irish", hometown: "Memphis" }, 3, {});

    expect(merged).toEqual({ firstName: "Margaret", hometown: "Memphis" });
  });

  it("does not change the values it was given", () => {
    const before = Object.freeze({ firstName: "Margaret" });

    const merged = mergeStepValues(before, 2, { hometown: "Memphis" });

    expect(merged).toEqual({ firstName: "Margaret", hometown: "Memphis" });
    expect(before).toEqual({ firstName: "Margaret" });
  });
});

describe("how far a draft lets the Caregiver go", () => {
  it("stops at step 1 until the name and birth year are valid", () => {
    expect(maxReachableStep({})).toBe(1);
    expect(maxReachableStep({ firstName: "Margaret" })).toBe(1);
  });

  it("stops at step 2 until the Hometown is valid", () => {
    expect(maxReachableStep({ firstName: "Margaret", birthYear: 1946 })).toBe(2);
  });

  it("opens the Seeds step once steps 1 and 2 are done, but not the ones after it", () => {
    expect(maxReachableStep({ firstName: "Margaret", birthYear: 1946, hometown: "Memphis" })).toBe(4);
  });

  it("opens every step once there are 2 Seeds", () => {
    const base = { firstName: "Margaret", birthYear: 1946, hometown: "Memphis" };
    const seed = (n: number) => ({ entityId: `fx-${n}`, name: `Seed ${n}`, domain: "music" as const, imageUrl: null });

    expect(maxReachableStep({ ...base, seeds: [seed(1)] })).toBe(4);
    expect(maxReachableStep({ ...base, seeds: [seed(1), seed(2)] })).toBe(6);
  });

  it("picks the requested step when allowed, else the furthest allowed one", () => {
    const values = { firstName: "Margaret", birthYear: 1946 };

    expect(firstReachableStep(1, values)).toBe(1);
    expect(firstReachableStep(2, values)).toBe(2);
    expect(firstReachableStep(5, values)).toBe(2);
  });
});

describe("the step in the URL", () => {
  it.each([
    ["1", 1],
    ["6", 6],
    ["3", 3],
  ])("reads %j as step %i", (raw, step) => {
    expect(parseStepParam(raw)).toBe(step);
  });

  it.each([null, "", "0", "7", "-1", "2.5", "abc", "02", "1e1"])("ignores %j", (raw) => {
    expect(parseStepParam(raw)).toBeNull();
  });
});

describe("the live Reminiscence Window preview", () => {
  it("shows the Window once the birth year is a valid four-digit year", () => {
    expect(previewWindow("1946")).toEqual({ birthYear: 1946, window: expect.objectContaining({ label: "1956 to 1976" }) });
    expect(previewWindow(" 1920 ")?.window.label).toBe("1930 to 1950");
    expect(previewWindow("1975")?.window.label).toBe("1985 to 2005");
  });

  it.each(["", "19", "194", "19466", "1919", "1976", "abc", "19.5", "-1946"])("shows nothing for %j", (text) => {
    expect(previewWindow(text)).toBeNull();
  });
});

describe("steps 4-6: what must hold before Next (FR-4, FR-5, FR-6)", () => {
  const seed = (n: number) => ({ entityId: `fx-${n}`, name: `Seed ${n}`, domain: "music" as const, imageUrl: null });

  it("step 4 needs at least 2 Seeds", () => {
    expect(validateLaterStep(4, { seeds: [seed(1)] }, {}).seeds).toBe("Choose at least 2 favorites to continue.");
    expect(validateLaterStep(4, {}, {}).seeds).toBe("Choose at least 2 favorites to continue.");
    expect(validateLaterStep(4, { seeds: [seed(1), seed(2)] }, {})).toEqual({});
  });

  it("step 4 never accepts text that has not been matched to an entity", () => {
    const errors = validateLaterStep(4, { seeds: [seed(1), seed(2)] }, { seeds: " Doris Day " });

    expect(errors.seeds).toBe("\u201cDoris Day\u201d is not matched yet. Choose Find, or clear the box, to continue.");
  });

  it("step 5 is optional, but not with half-typed entries", () => {
    expect(validateLaterStep(5, {}, {})).toEqual({});
    expect(validateLaterStep(5, {}, { avoidEntity: "Apocalypse" }).avoidEntity).toBe(
      "\u201cApocalypse\u201d is not matched yet. Choose Find, or clear the box, to continue.",
    );
    expect(validateLaterStep(5, {}, { avoidTopic: "hospitals" }).avoidTopic).toBe(
      "\u201chospitals\u201d is not on the list yet. Choose Add topic, or clear the box, to continue.",
    );
  });

  it("step 6 needs a Dementia Stage", () => {
    expect(validateLaterStep(6, {}, {}).dementiaStage).toBe("Choose a stage. Not sure? Choose Middle.");
    expect(validateLaterStep(6, { dementiaStage: "late" }, {})).toEqual({});
  });

  it("steps 1-3 have nothing extra to check here", () => {
    expect(validateLaterStep(2, {}, {})).toEqual({});
  });
});
