import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeagueChooser } from "../LeagueChooser";

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

describe("LeagueChooser", () => {
  it("renders a browsable card and separate official channel link for each League", () => {
    render(
      <LeagueChooser
        leagues={[
          {
            slug: "fliptop",
            name: "FlipTop",
            logoSrc: "/leagues/fliptop.png",
            channelUrl: "https://www.youtube.com/@fliptopbattles",
            sortOrder: 1,
            battleCount: 12,
          },
          {
            slug: "motus",
            name: "Motus",
            logoSrc: undefined,
            channelUrl: "https://www.youtube.com/@motusbattle",
            sortOrder: 2,
            battleCount: 4,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Browse FlipTop battles" }),
    ).toHaveAttribute("href", "/leagues/fliptop");
    expect(screen.getByText("12 public battles")).toBeInTheDocument();
    expect(screen.getByText("4 public battles")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Motus fallback" }),
    ).toBeInTheDocument();

    const channelLinks = screen.getAllByRole("link", {
      name: /^Official .* channel$/i,
    });
    expect(channelLinks).toHaveLength(2);
    expect(channelLinks[0]).toHaveAttribute(
      "href",
      "https://www.youtube.com/@fliptopbattles",
    );
    expect(channelLinks[0]).toHaveAttribute("target", "_blank");
  });
});
