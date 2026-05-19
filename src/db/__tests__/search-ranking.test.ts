import { describe, expect, it } from "vitest";
import {
  getSearchMode,
  normalizeSearchTerm,
  scoreSingleTokenSearchRow,
  scoreSearchRow,
} from "../compat";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    content: "di ka na makakabalik dito",
    speaker_label: "MC1",
    emcee_name: "Loonie",
    battle_title: "Loonie vs Abra",
    battle_event_name: "Ahon 13",
    battle_status: "reviewed",
    battle_event_date: "2024-01-01",
    emcee_id: "emcee-1",
    ...overrides,
  };
}

describe("All3Rounds search ranking", () => {
  it("normalizes accents, punctuation, case, and whitespace", () => {
    expect(normalizeSearchTerm("  \u00c1NG...  BUHAY!! ")).toBe("ang buhay");
  });

  it("uses broad mode for all single-token queries", () => {
    expect(getSearchMode("ang")).toBe("broad_single");
    expect(getSearchMode("buhay")).toBe("broad_single");
    expect(getSearchMode("bars")).toBe("broad_single");
    expect(getSearchMode("pistolero")).toBe("broad_single");
  });

  it("uses multi-token mode for remembered phrases", () => {
    expect(getSearchMode("di ka na")).toBe("multi_token");
  });

  it("scores exact emcee matches highly for narrow single-token searches", () => {
    const emceeMatch = scoreSingleTokenSearchRow(
      row({ content: "ibang linya", emcee_name: "Pistolero" }),
      "pistolero",
    );
    const contentOnly = scoreSingleTokenSearchRow(
      row({ content: "pistolero sa bara" }),
      "pistolero",
    );

    expect(emceeMatch).toBeGreaterThan(contentOnly);
  });

  it("preserves original single-token FTS order as a final tie-breaker", () => {
    const earlier = scoreSingleTokenSearchRow(row(), "pistolero", 1);
    const later = scoreSingleTokenSearchRow(row(), "pistolero", 10);

    expect(earlier).toBeGreaterThan(later);
  });

  it("scores exact phrases above unordered token matches", () => {
    const exact = scoreSearchRow(row(), "di ka na");
    const unordered = scoreSearchRow(
      row({ content: "ka makakabalik di na dito" }),
      "di ka na",
    );

    expect(exact).toBeGreaterThan(unordered);
  });

  it("scores ordered words above unordered words", () => {
    const ordered = scoreSearchRow(row({ content: "di yata ka talaga na" }), "di ka na");
    const unordered = scoreSearchRow(row({ content: "na yata ka talaga di" }), "di ka na");

    expect(ordered).toBeGreaterThan(unordered);
  });

  it("scores closer words above distant words", () => {
    const close = scoreSearchRow(row({ content: "di ka na" }), "di ka na");
    const far = scoreSearchRow(
      row({ content: "di salita salita salita salita salita ka salita salita na" }),
      "di ka na",
    );

    expect(close).toBeGreaterThan(far);
  });

  it("keeps metadata as a tie-breaker, not the main signal", () => {
    const weakTextReviewed = scoreSearchRow(
      row({ content: "ibang linya", battle_status: "reviewed" }),
      "di ka na",
    );
    const strongTextRaw = scoreSearchRow(
      row({ content: "di ka na", battle_status: "raw", emcee_id: null }),
      "di ka na",
    );

    expect(strongTextRaw).toBeGreaterThan(weakTextReviewed);
  });
});
