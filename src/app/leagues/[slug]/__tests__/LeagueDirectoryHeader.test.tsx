import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeagueDirectoryHeader } from "../LeagueDirectoryHeader";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

describe("LeagueDirectoryHeader", () => {
  it("identifies the League and keeps navigation actions distinct", () => {
    render(
      <LeagueDirectoryHeader
        league={{
          slug: "fliptop",
          name: "FlipTop",
          logoSrc: "/leagues/fliptop.png",
          channelUrl: "https://www.youtube.com/@fliptopbattles",
          sortOrder: 1,
          battleCount: 12,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "FlipTop Battles" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12 public battles")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "FlipTop" })).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Back to Leagues" }),
    ).toHaveAttribute("href", "/leagues");
    expect(
      screen.getByRole("link", { name: "Official FlipTop channel" }),
    ).toHaveAttribute("target", "_blank");
  });
});
