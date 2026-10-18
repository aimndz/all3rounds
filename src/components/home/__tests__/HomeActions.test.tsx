import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import HomeActions from "../HomeActions";

describe("HomeActions", () => {
  it("sends public browsing to Leagues", () => {
    render(<HomeActions />);

    expect(
      screen.getByRole("link", { name: /browse leagues.*explore leagues/i }),
    ).toHaveAttribute("href", "/leagues");
    expect(
      screen.queryByRole("link", { name: /browse battles/i }),
    ).not.toBeInTheDocument();
  });
});
