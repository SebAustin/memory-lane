/**
 * `checkText`: the deterministic guard on every string the model writes
 * (PLAN section 3.2 R4 as amended by section 14.6; FR-12; SC-7). A failing
 * string is replaced from the vetted templates, never regenerated.
 *
 * Two scopes:
 * - `body` (Prompts, caregiver tips, sensory activities, whyThis): quiz
 *   Prompts, therapeutic claims, Avoid terms (song titles included), the
 *   sensitive-theme lexicon (unless opted in), quoted strings that match no
 *   known name, and invented Title-Case names.
 * - `heading` (Session title and theme): quoted strings, Avoid terms, the
 *   sensitive lexicon and the claim lexicon only. Headings are human
 *   ("Saturday Night at the Pictures, 1962"), so neither the quiz rule nor
 *   the Title-Case rule applies to them.
 *
 * Pure: it runs on client and server.
 */
import { containsRun, wordsOf } from "@/domain/screening";
import {
  CLAIM_PATTERNS,
  DAYS,
  HOLIDAYS,
  MONTHS,
  QUIZ_PATTERNS,
  SENSITIVE_TERMS,
} from "@/domain/lexicons";

export type TextScope = "heading" | "body";

export type TextRule = "quiz" | "claim" | "avoid" | "sensitive" | "quote" | "invented-name";

/** One reason a string failed, with the offending text. */
export interface TextIssue {
  readonly rule: TextRule;
  readonly match: string;
}

/**
 * What the guard may treat as a known name. Registry, Seed and Learned
 * Favorite names are Qloo entities; fingerprint tags and places come from
 * Qloo and the Life Story. Days, months and holidays are built in.
 */
export interface TextCheckContext {
  readonly registryNames: readonly string[];
  readonly seedNames: readonly string[];
  readonly learnedFavoriteNames: readonly string[];
  readonly fingerprintTagNames: readonly string[];
  /** Hometown, Young-Adult City and Care Location. "Memphis, TN" also allows "Memphis". */
  readonly places: readonly string[];
  /** Free-text topics and entity names from the Avoid List. */
  readonly avoidTopics: readonly string[];
  /** When true the sensitive-theme lexicon is not applied. Avoid terms always are. */
  readonly sensitiveThemesOptIn: boolean;
}

const QUOTED = /["\u201C]([^"\u201C\u201D]*)["\u201D]/g;
const WORD_TOKEN = /\p{L}[\p{L}\p{N}]*(?:['\u2019\u02BC]\p{L}[\p{L}\p{N}]*)*/gu;
const TITLE_CASE = /^\p{Lu}(?=.*\p{Ll})[\p{L}'\u2019\u02BC]*$/u;
const SENTENCE_BREAK = /[.!?:;\n]/;
const RUN_JOINER = /^[ \t\u00A0\-\u2010-\u2012]+$/;
const MASK = "\u00B6";
const MIN_NAME_RUN = 2;

/** Checks `text` against the rules of `scope`. An empty result means it may be shown. */
export function checkText(text: string, scope: TextScope, ctx: TextCheckContext): TextIssue[] {
  const issues: TextIssue[] = [];
  if (scope === "body") issues.push(...quizIssues(text));
  issues.push(...claimIssues(text));
  issues.push(...avoidIssues(text, ctx.avoidTopics));
  if (!ctx.sensitiveThemesOptIn) issues.push(...sensitiveIssues(text));
  issues.push(...quoteIssues(text, knownNames(ctx)));
  if (scope === "body") issues.push(...inventedNameIssues(text, knownNames(ctx)));
  return issues;
}

function patternIssues(rule: TextRule, text: string, patterns: readonly RegExp[]): TextIssue[] {
  const plain = text.replace(/[’ʼ]/g, "'");
  return patterns.flatMap((pattern) => {
    const hit = pattern.exec(plain);
    return hit === null ? [] : [{ rule, match: hit[0] }];
  });
}

const quizIssues = (text: string) => patternIssues("quiz", text, QUIZ_PATTERNS);
const claimIssues = (text: string) => patternIssues("claim", text, CLAIM_PATTERNS);

/** Topics whose words appear in order, side by side, in `text` (Avoid-List normalization). */
function topicIssues(rule: TextRule, text: string, topics: readonly string[]): TextIssue[] {
  const textWords = wordsOf(text);
  return topics.flatMap((topic) => {
    const topicWords = wordsOf(topic);
    return topicWords.length > 0 && containsRun(textWords, topicWords) ? [{ rule, match: topic }] : [];
  });
}

const avoidIssues = (text: string, topics: readonly string[]) => topicIssues("avoid", text, topics);
const sensitiveIssues = (text: string) => topicIssues("sensitive", text, SENSITIVE_TERMS);

/** Registry, Seed, Learned Favorite and tag names plus places: every Qloo- or Life-Story-backed name. */
function knownNames(ctx: TextCheckContext): readonly string[] {
  return [
    ...ctx.registryNames,
    ...ctx.seedNames,
    ...ctx.learnedFavoriteNames,
    ...ctx.fingerprintTagNames,
    ...ctx.places.flatMap((place) => [place, ...place.split(",")]),
  ];
}

/** Normalized key of a name: stemmed words, without a leading article. */
function nameKey(name: string): string {
  const words = wordsOf(name);
  return (words[0] === "the" ? words.slice(1) : words).join(" ");
}

function quoteIssues(text: string, names: readonly string[]): TextIssue[] {
  const known = new Set([...names, ...DAYS, ...MONTHS, ...HOLIDAYS].map(nameKey));
  const issues: TextIssue[] = [];
  text.replace(QUOTED, (span: string, inner: string) => {
    const key = nameKey(inner);
    if (key !== "" && !known.has(key)) issues.push({ rule: "quote", match: inner });
    return span;
  });
  return issues;
}

interface Token {
  readonly start: number;
  readonly end: number;
  readonly words: readonly string[];
  readonly isTitleCase: boolean;
  readonly isSentenceInitial: boolean;
}

/** Word tokens of `text`; quoted spans are masked out so the quote rule owns them. */
function tokenize(text: string): Token[] {
  const masked = text.replace(QUOTED, (span: string) => MASK.repeat(span.length));
  let previousEnd = 0;
  return [...masked.matchAll(WORD_TOKEN)].map((hit, index) => {
    const start = hit.index;
    const gap = masked.slice(previousEnd, start);
    previousEnd = start + hit[0].length;
    return {
      start,
      end: previousEnd,
      words: wordsOf(hit[0]),
      isTitleCase: TITLE_CASE.test(hit[0]),
      isSentenceInitial: index === 0 || SENTENCE_BREAK.test(gap),
    };
  });
}

/** Marks every token that sits inside an occurrence of an allowed name. */
function coveredTokens(tokens: readonly Token[], names: readonly string[]): boolean[] {
  const flatWords = tokens.flatMap((token) => token.words);
  const marked = new Set<number>();
  for (const phrase of [...names, ...DAYS, ...MONTHS, ...HOLIDAYS].map(wordsOf)) {
    for (let start = 0; phrase.length > 0 && start + phrase.length <= flatWords.length; start += 1) {
      if (phrase.every((word, offset) => flatWords[start + offset] === word)) {
        phrase.forEach((_word, offset) => marked.add(start + offset));
      }
    }
  }
  let nextWord = 0;
  return tokens.map((token) => {
    const own = token.words.map((_word, offset) => nextWord + offset);
    nextWord += token.words.length;
    return own.every((index) => marked.has(index));
  });
}

interface Run {
  readonly start: number;
  readonly end: number;
  readonly length: number;
}

/**
 * Title-Case runs of 2+ words that are not on the allow-list. Sentence-initial
 * words are exempt (they are capitalised anyway), and a comma, number or quote
 * ends a run. A run is a name the model may have made up.
 */
function inventedNameIssues(text: string, names: readonly string[]): TextIssue[] {
  const tokens = tokenize(text);
  const covered = coveredTokens(tokens, names);
  const issues: TextIssue[] = [];
  let run: Run | undefined;
  let previous: Token | undefined;

  const flush = (): void => {
    if (run !== undefined && run.length >= MIN_NAME_RUN) {
      issues.push({ rule: "invented-name", match: text.slice(run.start, run.end) });
    }
    run = undefined;
  };

  tokens.forEach((token, index) => {
    const isCandidate = token.isTitleCase && !token.isSentenceInitial && !covered[index];
    const joins =
      run !== undefined && previous !== undefined && RUN_JOINER.test(text.slice(previous.end, token.start));
    if (!isCandidate || !joins) flush();
    if (isCandidate) {
      run = { start: run?.start ?? token.start, end: token.end, length: (run?.length ?? 0) + 1 };
    }
    previous = token;
  });
  flush();
  return issues;
}
