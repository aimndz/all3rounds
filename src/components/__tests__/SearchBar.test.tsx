import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import SearchBar from "../SearchBar";

describe("SearchBar", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });
  it("renders search input and button", () => {
    render(<SearchBar />);
    expect(
      screen.getByPlaceholderText(/search for a line/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("renders with initial query", () => {
    render(<SearchBar initialQuery="loonie" />);
    expect(screen.getByDisplayValue("loonie")).toBeInTheDocument();
  });

  it("navigates to search page on submit", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search for a line/i);
    await user.type(input, "test query");
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(mockPush).toHaveBeenCalledWith("/search?q=test%20query");
  });

  it("does not navigate when query is empty", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("trims whitespace before navigating", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search for a line/i);
    await user.type(input, "  hello  ");
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(mockPush).toHaveBeenCalledWith("/search?q=hello");
  });
});
