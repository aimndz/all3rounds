import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mocks.back,
    push: mocks.push,
  }),
}));

import PageBackButton from "../PageBackButton";

describe("PageBackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
  });

  it("uses the deterministic fallback when there is no browser history", () => {
    render(<PageBackButton fallbackHref="/leagues/fliptop" label="Back to FlipTop" />);

    fireEvent.click(screen.getByRole("button", { name: /back to fliptop/i }));

    expect(mocks.push).toHaveBeenCalledWith("/leagues/fliptop");
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it("preserves browser-history back behavior when history exists", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 2,
    });
    render(<PageBackButton fallbackHref="/leagues/fliptop" label="Back to FlipTop" />);

    fireEvent.click(screen.getByRole("button", { name: /back to fliptop/i }));

    expect(mocks.back).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
