import { describe, expect, it } from "vitest";
import { getLeagueDirectoryPath } from "../leagues";

describe("League directory route helpers", () => {
  it("builds a canonical League path with supported directory filters", () => {
    expect(
      getLeagueDirectoryPath("fliptop", {
        q: "loonie vs abra",
        status: "reviewed",
        year: "2024",
        sort: "oldest",
        page: "2",
        league: "motus",
        eventLimit: "20",
      }),
    ).toBe(
      "/leagues/fliptop?q=loonie+vs+abra&status=reviewed&year=2024&sort=oldest&page=2",
    );
  });
});
