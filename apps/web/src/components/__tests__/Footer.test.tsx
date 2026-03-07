import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

describe("Footer", () => {
  it("renders disclaimer text", () => {
    render(<Footer />);
    expect(screen.getByText(/disclaimer/i)).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("mentions All3Rounds", () => {
    render(<Footer />);
    const matches = screen.getAllByText(/All3Rounds/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
