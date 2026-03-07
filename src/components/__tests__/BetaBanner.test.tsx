import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock next/link
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

import BetaBanner from "../BetaBanner";

describe("BetaBanner", () => {
  beforeEach(() => {
    store = {};
    localStorageMock.getItem.mockImplementation(
      (key: string) => store[key] ?? null,
    );
    localStorageMock.setItem.mockImplementation(
      (key: string, value: string) => {
        store[key] = value;
      },
    );
  });

  it("renders beta badge and message when not dismissed", async () => {
    await act(async () => {
      render(<BetaBanner />);
    });
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText(/inaccuracies/i)).toBeInTheDocument();
  });

  it("hides the banner when close button is clicked", async () => {
    await act(async () => {
      render(<BetaBanner />);
    });
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "beta-banner-hidden",
      "true",
    );
  });

  it("does not render when previously dismissed", () => {
    store["beta-banner-hidden"] = "true";
    const { container } = render(<BetaBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("has a link to /random", async () => {
    await act(async () => {
      render(<BetaBanner />);
    });
    const link = screen.getByText(/help improve/i).closest("a");
    expect(link).toHaveAttribute("href", "/random");
  });
});
