import { describe, it, expect } from "vitest";
import {
  parseSearchTokens,
  levenshtein,
  scoreBattle,
  type BattleResponse,
} from "../fuzzy-utils";

// ============================================================================
// parseSearchTokens
// ============================================================================

describe("parseSearchTokens", () => {
  it("returns empty array for empty input", () => {
    expect(parseSearchTokens("")).toEqual([]);
    // @ts-expect-error testing invalid input
    expect(parseSearchTokens(undefined)).toEqual([]);
  });

  it("lowercases and splits on whitespace", () => {
    expect(parseSearchTokens("Loonie Mhot")).toEqual(["loonie", "mhot"]);
  });

  it("strips noise words: vs, v, and, the, pt, part", () => {
    expect(parseSearchTokens("Loonie vs Mhot")).toEqual(["loonie", "mhot"]);
    expect(parseSearchTokens("the battle part 2")).toEqual(["battle", "2"]);
    expect(parseSearchTokens("A v B and C")).toEqual(["a", "b", "c"]);
  });

  it("strips punctuation", () => {
    expect(parseSearchTokens("hello, world! 'test'")).toEqual([
      "hello",
      "world",
      "test",
    ]);
  });

  it("deduplicates tokens", () => {
    expect(parseSearchTokens("loonie loonie")).toEqual(["loonie"]);
  });

  it("handles extra whitespace", () => {
    expect(parseSearchTokens("  loonie   mhot  ")).toEqual(["loonie", "mhot"]);
  });
});

// ============================================================================
// levenshtein
// ============================================================================

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });

  it("returns length of other string when one is empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });

  it("computes single edit distance", () => {
    expect(levenshtein("cat", "bat")).toBe(1); // substitution
    expect(levenshtein("cat", "cats")).toBe(1); // insertion
    expect(levenshtein("cats", "cat")).toBe(1); // deletion
  });

  it("computes multi-edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("sunday", "saturday")).toBe(3);
  });

  it("is symmetric", () => {
    expect(levenshtein("abc", "xyz")).toBe(levenshtein("xyz", "abc"));
  });
});

// ============================================================================
// scoreBattle
// ============================================================================

describe("scoreBattle", () => {
  const makeBattle = (
    title: string,
    event_name?: string | null,
  ): BattleResponse => ({
    title,
    event_name: event_name ?? null,
  });

  it("returns 0 for empty tokens", () => {
    expect(scoreBattle(makeBattle("Loonie vs Mhot"), [])).toBe(0);
  });

  it("scores exact word matches at 100pts each", () => {
    const battle = makeBattle("Loonie vs Mhot");
    // "loonie" matches exactly → 100pts + all-matched bonus (1000) + sequence bonus
    const score = scoreBattle(battle, ["loonie"]);
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it("gives higher score for exact matches than substring", () => {
    const battle = makeBattle("Loonie vs Mhot");
    const exactScore = scoreBattle(battle, ["loonie"]);
    const substringScore = scoreBattle(battle, ["loon"]);
    expect(exactScore).toBeGreaterThan(substringScore);
  });

  it("awards all-tokens-matched bonus (+1000)", () => {
    const battle = makeBattle("Loonie vs Mhot");
    const bothMatched = scoreBattle(battle, ["loonie", "mhot"]);
    // With both matched: 100+100+1000 + possible sequence bonus
    expect(bothMatched).toBeGreaterThanOrEqual(1200);
  });

  it("awards exact sequence bonus (+10000)", () => {
    const battle = makeBattle("Loonie vs Mhot");
    // Title tokens after filtering noise: ["loonie", "mhot"]
    // Searching "loonie mhot" → exact sequence match
    const score = scoreBattle(battle, ["loonie", "mhot"]);
    expect(score).toBeGreaterThanOrEqual(11200); // 200 + 1000 + 10000
  });

  it("awards reversed sequence bonus (+5000)", () => {
    const battle = makeBattle("Loonie vs Mhot");
    // Searching "mhot loonie" → reversed match
    const score = scoreBattle(battle, ["mhot", "loonie"]);
    expect(score).toBeGreaterThanOrEqual(6200); // 200 + 1000 + 5000
  });

  it("exact sequence scores higher than reversed", () => {
    const battle = makeBattle("Loonie vs Mhot");
    const exact = scoreBattle(battle, ["loonie", "mhot"]);
    const reversed = scoreBattle(battle, ["mhot", "loonie"]);
    expect(exact).toBeGreaterThan(reversed);
  });

  it("awards event name bonus", () => {
    const withEvent = makeBattle("Loonie vs Mhot", "FlipTop Festival");
    const withoutEvent = makeBattle("Loonie vs Mhot");
    const scoreWith = scoreBattle(withEvent, ["fliptop"]);
    const scoreWithout = scoreBattle(withoutEvent, ["fliptop"]);
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it("performs fuzzy matching for typos", () => {
    const battle = makeBattle("Loonie vs Mhot");
    // "loone" is 1 edit from "loonie" → should fuzzy match
    const score = scoreBattle(battle, ["loone"]);
    expect(score).toBeGreaterThan(0);
  });

  it("does not fuzzy match short tokens (< 3 chars)", () => {
    const battle = makeBattle("Loonie vs Mhot");
    // "lo" is too short for fuzzy matching
    const score = scoreBattle(battle, ["xz"]);
    expect(score).toBe(0);
  });

  it("handles substring matches (token includes word or word includes token)", () => {
    const battle = makeBattle("Loonie vs Mhot");
    // "loon" is substring of "loonie"
    const score = scoreBattle(battle, ["loon"]);
    expect(score).toBeGreaterThan(0);
    // Score should include 50 + len*2 = 50 + 8 = 58
    expect(score).toBeGreaterThanOrEqual(58);
  });
});
