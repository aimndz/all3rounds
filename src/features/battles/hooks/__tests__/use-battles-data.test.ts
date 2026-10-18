import { describe, expect, it } from "vitest";
import { groupByEvent, type Battle } from "../use-battles-data";

const makeBattle = (
  id: string,
  eventName: string | null,
  league: string,
): Battle => ({
  id,
  league,
  slug: `${id}-slug`,
  title: `Battle ${id}`,
  youtube_id: `youtube-${id}`,
  event_name: eventName,
  event_date: "2025-01-01",
  url: `https://youtube.com/watch?v=${id}`,
  status: "reviewed",
});

describe("groupByEvent", () => {
  it("keeps identical event names separate for different leagues", () => {
    const groups = groupByEvent([
      makeBattle("one", "Event One", "sunugan"),
      makeBattle("two", "Event One", "fliptop"),
      makeBattle("three", "Event One", "sunugan"),
    ]);

    expect(groups).toHaveLength(2);
    expect(
      groups.find((group) => group.league === "sunugan")?.battles,
    ).toHaveLength(2);
    expect(
      groups.find((group) => group.league === "fliptop")?.battles,
    ).toHaveLength(1);
  });

  it("keeps unnamed battles separate for each league", () => {
    const groups = groupByEvent([
      makeBattle("one", null, "sunugan"),
      makeBattle("two", null, "fliptop"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.name === "Other Battles")).toBe(true);
    expect(groups.map((group) => group.league).sort()).toEqual([
      "fliptop",
      "sunugan",
    ]);
  });

  it("preserves date ordering while treating event identity as scoped", () => {
    const groups = groupByEvent([
      { ...makeBattle("old", "Shared", "fliptop"), event_date: "2024-01-01" },
      { ...makeBattle("new", "Shared", "motus"), event_date: "2025-01-01" },
    ]);

    expect(groups.map((group) => group.league)).toEqual(["motus", "fliptop"]);
  });
});
