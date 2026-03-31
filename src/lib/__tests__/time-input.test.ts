import { describe, expect, it } from "vitest";
import { formatTimeInputValue, parseTimeInputValue } from "@/lib/time-input";

describe("parseTimeInputValue", () => {
  it("accepts pure seconds", () => {
    expect(parseTimeInputValue("75.5")).toEqual({
      ok: true,
      seconds: 75.5,
      normalized: "1:15.5",
    });
  });

  it("accepts mm:ss below one hour", () => {
    expect(parseTimeInputValue("59:59")).toEqual({
      ok: true,
      seconds: 3599,
      normalized: "59:59",
    });
  });

  it("accepts hh:mm:ss for one hour or more", () => {
    expect(parseTimeInputValue("1:02:03.5")).toEqual({
      ok: true,
      seconds: 3723.5,
      normalized: "1:02:03.5",
    });
  });

  it("rejects mm:ss when the minutes cross an hour", () => {
    expect(parseTimeInputValue("60:00")).toEqual({
      ok: false,
      error: "Use hh:mm:ss for one hour or more.",
    });
  });

  it("rejects invalid seconds segments", () => {
    expect(parseTimeInputValue("1:61")).toEqual({
      ok: false,
      error: "Seconds must stay below 60.",
    });
  });
});

describe("formatTimeInputValue", () => {
  it("formats values below one hour as mm:ss", () => {
    expect(formatTimeInputValue(125)).toBe("2:05");
  });

  it("formats values above one hour as hh:mm:ss", () => {
    expect(formatTimeInputValue(3723)).toBe("1:02:03");
  });

  it("can suppress decimals for initial display", () => {
    expect(formatTimeInputValue(75.97, { includeDecimals: false })).toBe(
      "1:15",
    );
  });
});
