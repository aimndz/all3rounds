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
  it("collects the unique leagues represented by each event", () => {
    const groups = groupByEvent([
      makeBattle("one", "Event One", "sunugan"),
      makeBattle("two", "Event One", "fliptop"),
      makeBattle("three", "Event One", "sunugan"),
    ]);

    expect(groups[0]?.leagues).toEqual(["fliptop", "sunugan"]);
  });
});
