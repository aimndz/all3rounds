import { describe, expect, it } from "vitest";
import { rankSuggestionsByFrequency } from "../server";

describe("rankSuggestionsByFrequency", () => {
  it("prefers higher line counts before shorter phrases", () => {
    const ranked = rankSuggestionsByFrequency([
      { phrase: "flawless ka", lineCount: 12 },
      { phrase: "fliptop", lineCount: 45 },
      { phrase: "flip top", lineCount: 45 },
      { phrase: "flip top ctj", lineCount: 45 },
    ]);

    expect(ranked.map((entry) => entry.phrase)).toEqual([
      "fliptop",
      "flip top",
      "flip top ctj",
      "flawless ka",
    ]);
  });
});
