import { describe, expect, it } from "vitest";
import { checkText, type TextCheckContext, type TextRule } from "@/domain/checkText";

/**
 * The labelled table (PLAN section 3.2 R4, section 14.6, ticket 09, SC-7).
 * `flags` lists rules the string must trigger (others may fire too: an Avoid
 * title in Title-Case is also an "invented name"). An empty `flags` means the
 * string must pass untouched.
 */
interface Row {
  readonly text: string;
  readonly scope: "heading" | "body";
  readonly flags: readonly TextRule[];
  /** Set for the opt-in variants of the sensitive lexicon. */
  readonly optIn?: true;
}

const ctx = (sensitiveThemesOptIn = false): TextCheckContext => ({
  registryNames: ["Patsy Cline", "Pillow Talk", "The Carpenters", "Rock Around the Clock", "Grand Ole Opry"],
  seedNames: ["Doris Day"],
  learnedFavoriteNames: ["Brenda Lee"],
  fingerprintTagNames: ["Country Music", "Rockabilly"],
  places: ["Memphis", "Nashville", "Beale Street"],
  avoidTopics: ["Tennessee Waltz", "hospitals", "Vietnam War"],
  sensitiveThemesOptIn,
});

const body = (text: string, ...flags: TextRule[]): Row => ({ text, scope: "body", flags });
const heading = (text: string, ...flags: TextRule[]): Row => ({ text, scope: "heading", flags });

const ROWS: readonly Row[] = [
  // --- body: good strings that must pass untouched (18) ---
  body("Tell me about the dances you went to."),
  body('Tell me about seeing "Pillow Talk"'),
  body("Tell me about the first time you heard Patsy Cline on the radio."),
  body("Tell me about Saturday nights in Memphis."),
  body("Tell me about December in Nashville."),
  body("What was Christmas like at home?"),
  body("Sing along with Brenda Lee if you like."),
  body("Country Music and Rockabilly were on the radio."),
  body("Imagine Grand Ole Opry on a Sunday night."),
  body("People who share {name}'s era and favorites often loved this."),
  body("A special treat: a warm cup of tea and a biscuit."),
  body("Hum along if {name} feels like it. There is no right or wrong."),
  body("Tell me about Doris Day and the films you saw in Nashville."),
  body("Rock Around the Clock was on the jukebox."),
  body('Tell me about "Carpenters" songs.'),
  body("Tell me about Easter Sunday at church."),
  body("Tell me about growing up in Memphis, Tennessee."),
  // --- body: quiz Prompts (9) ---
  body("Do you remember the first dance you went to?", "quiz"),
  body("What year did you see that film?", "quiz"),
  body("Who was the lead singer?", "quiz"),
  body("Can you recall the name of the song?", "quiz"),
  body("Do you know which town the band came from?", "quiz"),
  body("Name the three songs you used to sing.", "quiz"),
  body("Remember when you saw it at the cinema?", "quiz"),
  body("How old were you when you first heard it?", "quiz"),
  // --- body: therapeutic claims (8) ---
  body("Listening to music like this may improve memory.", "claim"),
  body("This is a gentle form of music therapy.", "claim"),
  body("Reminiscing can heal old wounds.", "claim"),
  body("It helps slow the decline of memory.", "claim"),
  body("Clinically proven to reduce agitation.", "claim"),
  body("A cure for loneliness.", "claim"),
  body("Brain training for a sharper mind.", "claim"),
  // --- body: Avoid terms, including a song title (6) ---
  body("Put on the Tennessee Waltz and sway together.", "avoid"),
  body("tennessee waltz might be playing softly.", "avoid"),
  body("Tell me about the old hospital by the river.", "avoid"),
  body("General Hospital was on every afternoon.", "avoid"),
  body("Sing “Tennessee Waltz” softly.", "avoid"),
  { text: "Tell me about the hospitals nearby.", scope: "body", flags: ["avoid"], optIn: true },
  // --- body: sensitive themes (6) and the opt-in variants (2) ---
  body("Tell me about the war years.", "sensitive"),
  body("Talk about a soldier you knew.", "sensitive"),
  body("The family held a funeral that spring.", "sensitive"),
  body("Let's talk about how you grieved.", "sensitive"),
  body("Share a quiet moment for someone who passed away.", "sensitive"),
  body("Tell me about the nurses on the surgery ward.", "sensitive"),
  { text: "Tell me about the war years.", scope: "body", flags: [], optIn: true },
  { text: "Talk about a soldier you knew.", scope: "body", flags: [], optIn: true },
  // --- body: quoted strings that match no registry name (3) ---
  body('Tell me about seeing "Midnight Moon Revue"', "quote"),
  body('Sing along to "Silver Bells and Roses".', "quote"),
  body("Tell me about “The Golden Lantern”.", "quote"),
  // --- body: invented Title-Case names (6) ---
  body("Tell me about Johnny Marcus and the Blue Notes.", "invented-name"),
  body("Sing along with Silver Strings tonight.", "invented-name"),
  body("Tell me about Ruby Hart, who sang at the dance.", "invented-name"),
  body("Tell me about the Lucille Ball Show.", "invented-name"),
  body("Remember Johnny Mercer? Tell me about him.", "invented-name"),
  // --- headings: the UX example titles and other good headings pass (9) ---
  heading("Saturday Night at the Pictures, 1962"),
  heading("Mama's Kitchen"),
  heading("Sunday Best at the Grand Ole Opry"),
  heading("Christmas on Beale Street"),
  heading("Songs on the Radio"),
  heading("Johnny Marcus Jukebox Night"),
  heading('Matinee at the Movies: "Pillow Talk"'),
  heading("Spring Fever with Patsy Cline"),
  { text: "Songs of the War Years", scope: "heading", flags: [], optIn: true },
  // --- headings: flagged (7) ---
  heading('A Night with "Moonlight Serenade"', "quote"),
  heading("Songs of the War Years", "sensitive"),
  heading("Tennessee Waltz Evenings", "avoid"),
  heading("Music Therapy Hour", "claim"),
  heading("Memory Boost Mornings", "claim"),
  heading("Healing Songs for Sunday", "claim"),
  heading("Hospital Visits and Old Favorites", "avoid"),
];

const label = (row: Row) =>
  `${row.scope}${row.optIn ? "+optIn" : ""} ${row.flags.length === 0 ? "OK" : row.flags.join(",")}: ${row.text}`;

describe("checkText: the 70-string labelled table (SC-7)", () => {
  it("has exactly 70 labelled strings", () => {
    expect(ROWS).toHaveLength(70);
  });

  it.each(ROWS.map((row) => [label(row), row] as const))("%s", (_label, row) => {
    const rules = checkText(row.text, row.scope, ctx(row.optIn === true)).map((issue) => issue.rule);

    if (row.flags.length === 0) expect(rules).toEqual([]);
    else for (const flag of row.flags) expect(rules).toContain(flag);
  });
});

describe("checkText: scope and rule details", () => {
  it("returns the offending text with each issue", () => {
    expect(checkText("Do you remember the dance?", "body", ctx())).toEqual([
      { rule: "quiz", match: "Do you remember" },
    ]);
    expect(checkText("Hospitals were busy.", "body", ctx(true))).toEqual([
      { rule: "avoid", match: "hospitals" },
    ]);
  });

  it("never applies the quiz rule or the Title-Case rule to headings", () => {
    expect(checkText("Do You Remember Saturday Nights", "heading", ctx())).toEqual([]);
    expect(checkText("Lucille Ball Afternoon", "heading", ctx())).toEqual([]);
  });

  it("keeps Avoid terms on even when the sensitive lexicon is opted into", () => {
    const rules = checkText("The Vietnam War years", "heading", ctx(true)).map((issue) => issue.rule);
    expect(rules).toEqual(["avoid"]);
  });

  it("matches Avoid terms by whole word, ignoring case, accents and plurals", () => {
    const withCafe: TextCheckContext = { ...ctx(), avoidTopics: ["Café Tacvba"] };
    expect(checkText("Put on cafe tacvba records.", "body", withCafe).map((i) => i.rule)).toContain("avoid");
    expect(checkText("Warren was a fine singer.", "body", { ...ctx(), avoidTopics: ["war"] })).toEqual([]);
  });

  it("reports each Avoid topic once and ignores blank topics", () => {
    const twice: TextCheckContext = { ...ctx(), avoidTopics: ["hospital", "", "  ", "waltz"] };
    const issues = checkText("a hospital waltz, then a waltz", "body", twice).filter((i) => i.rule === "avoid");
    expect(issues.map((i) => i.match)).toEqual(["hospital", "waltz"]);
  });

  it("accepts a quoted name from any allow-list source", () => {
    expect(checkText('Tell me about "Brenda Lee".', "body", ctx())).toEqual([]);
    expect(checkText('Tell me about "Doris Day".', "body", ctx())).toEqual([]);
    expect(checkText('Tell me about "Rockabilly".', "body", ctx())).toEqual([]);
    expect(checkText('Tell me about "Memphis".', "body", ctx())).toEqual([]);
  });

  it("ignores empty quotes and an unbalanced quote", () => {
    expect(checkText('Tell me about "" and that.', "body", ctx())).toEqual([]);
    expect(checkText('Tell me about "Patsy Cline', "body", ctx())).toEqual([]);
  });

  it("does not run the Title-Case rule inside quotes (the quote rule owns them)", () => {
    const rules = checkText('Tell me about "Midnight Moon Revue".', "body", ctx()).map((i) => i.rule);
    expect(rules).toEqual(["quote"]);
  });

  it("treats days, months and holidays as known, and a lone capitalised word as fine", () => {
    expect(checkText("Tell me about Christmas Eve and New Year.", "body", ctx())).toEqual([]);
    expect(checkText("Tell me about Valentine's Day in March.", "body", ctx())).toEqual([]);
    expect(checkText("Tell me about Johnny.", "body", ctx())).toEqual([]);
  });

  it("exempts sentence-initial words but still catches the name after them", () => {
    expect(checkText("Sunday Best was the dress code.", "body", ctx())).toEqual([]);
    expect(checkText("Dancing. Ruby Hart danced too.", "body", ctx()).map((i) => i.rule)).toEqual([]);
    expect(checkText("Lovely. Remember Ruby Hart?", "body", ctx()).map((i) => i.rule)).toContain("invented-name");
  });

  it("does not let a comma or a number join two names into one run", () => {
    expect(checkText("Tell me about Ruby, Hart and Lee.", "body", ctx())).toEqual([]);
    expect(checkText("Tell me about Ruby 1962 Hart.", "body", ctx())).toEqual([]);
  });

  it("reports one issue per uncovered run, as written", () => {
    const issues = checkText("Tell me about Ruby Hart and Ruby Hart.", "body", ctx());
    expect(issues).toEqual([{ rule: "invented-name", match: "Ruby Hart" }, { rule: "invented-name", match: "Ruby Hart" }]);
  });

  it("copes with accents, hyphens, apostrophes and the {name} placeholder", () => {
    expect(checkText("Tell me about José Feliciano.", "body", ctx()).map((i) => i.rule)).toEqual(["invented-name"]);
    expect(checkText("Tell me about Jean-Luc Picard.", "body", ctx()).map((i) => i.rule)).toEqual(["invented-name"]);
    expect(checkText("Tell me about {name}'s kitchen.", "body", ctx())).toEqual([]);
    expect(checkText("Tell me about the O’Brien Pub.", "body", ctx()).map((i) => i.rule)).toEqual(["invented-name"]);
  });

  it("does not flag everyday words that merely contain a lexicon word", () => {
    expect(checkText("Share a healthy snack, a treat and a curious story.", "body", ctx())).toEqual([]);
    expect(checkText("Tell me about the warm summer evenings.", "body", ctx())).toEqual([]);
    expect(checkText("Tell me about the grave voice of the singer.", "body", ctx()).map((i) => i.rule)).toEqual(["sensitive"]);
  });

  it("lets a place written as \"City, ST\" be named by its city alone", () => {
    const withTn: TextCheckContext = { ...ctx(), places: ["Memphis, TN"] };
    expect(checkText("Tell me about Memphis Beale.", "body", withTn).map((i) => i.rule)).toEqual([]);
    expect(checkText('Tell me about "Memphis".', "body", withTn)).toEqual([]);
  });

  it("passes the empty string", () => {
    expect(checkText("", "body", ctx())).toEqual([]);
    expect(checkText("   ", "heading", ctx())).toEqual([]);
  });
});
