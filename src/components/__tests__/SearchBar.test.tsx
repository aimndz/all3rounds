import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
const mockFetch = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import SearchBar from "../SearchBar";

function getSubmitButton() {
  return screen.getAllByRole("button", { name: /run search/i })[0];
}

describe("SearchBar", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("renders search input and button", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText(/search lines/i)).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it("renders with initial query", () => {
    render(<SearchBar initialQuery="loonie" />);
    expect(screen.getByText("loonie")).toBeInTheDocument();
  });

  it("renders parsed filter badges from the initial query", () => {
    render(<SearchBar initialQuery="fliptop emcee:loonie" />);
    expect(screen.getByText(/loonie/i)).toBeInTheDocument();
    expect(screen.getByText("fliptop")).toBeInTheDocument();
  });

  it("navigates to search page on submit", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search lines/i);
    await user.type(input, "test query");
    await user.click(getSubmitButton());
    expect(mockPush).toHaveBeenCalledWith("/search?q=test%20query");
  });

  it("does not navigate when query is empty", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.click(getSubmitButton());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("trims whitespace before navigating", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search lines/i);
    await user.type(input, "  hello  ");
    await user.click(getSubmitButton());
    expect(mockPush).toHaveBeenCalledWith("/search?q=hello");
  });

  it("shows filter suggestions and turns a selected filter into an inline badge", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.click(input);
    await user.click(
      screen.getByRole("button", { name: /from a specific emcee/i }),
    );
    await user.type(screen.getByRole("textbox", { name: /search/i }), "loonie");
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("button", { name: /edit emcee filter/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("loonie")).toBeInTheDocument();
  });

  it("auto-starts a badge when the user types a filter prefix", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "emcee:");

    expect(screen.getByText("emcee:")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /search/i })).toHaveFocus();
  });

  it("pulls the last badge back into the input with backspace when the text input is empty", async () => {
    const user = userEvent.setup();
    render(<SearchBar initialQuery="emcee:loonie" />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(
      screen.queryByRole("button", { name: /edit emcee filter/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("emcee:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("loonie")).toBeInTheDocument();
  });

  it("lets the user click a badge to edit it in place", async () => {
    const user = userEvent.setup();
    render(<SearchBar initialQuery="game emcee:loonie" />);

    await user.click(
      screen.getByRole("button", { name: /edit emcee filter/i }),
    );

    expect(
      screen.queryByRole("button", { name: /edit emcee filter/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("emcee:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("loonie")).toBeInTheDocument();
  });

  it("submits text plus inline filters", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "game");
    await user.click(
      screen.getByRole("button", { name: /from a specific emcee/i }),
    );
    await user.type(screen.getByRole("textbox", { name: /search/i }), "loonie");
    await user.keyboard("{Enter}");
    await user.click(getSubmitButton());

    expect(mockPush).toHaveBeenCalledWith("/search?q=game%20emcee%3Aloonie");
  });

  it("accepts multiple different filters in one query", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "fliptop game");
    await user.click(
      screen.getByRole("button", { name: /from a specific emcee/i }),
    );
    await user.type(screen.getByRole("textbox", { name: /search/i }), "loonie");
    await user.keyboard("{Enter}");
    await user.click(
      screen.getByRole("button", { name: /from a specific battle/i }),
    );
    await user.type(screen.getByRole("textbox", { name: /search/i }), "psp");
    await user.keyboard("{Enter}");
    await user.click(getSubmitButton());

    expect(mockPush).toHaveBeenCalledWith(
      "/search?q=fliptop%20game%20emcee%3Aloonie%20battle%3Apsp",
    );
  });

  it("quotes multi-word filter values when submitting an inline filter", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "emcee:");
    await user.type(
      screen.getByRole("textbox", { name: /search/i }),
      "dave denver",
    );
    await user.keyboard("{Tab}");
    await user.type(
      screen.getByRole("textbox", { name: /search/i }),
      "fliptop game",
    );
    await user.click(getSubmitButton());

    expect(mockPush).toHaveBeenCalledWith(
      "/search?q=emcee%3A%22dave%20denver%22%20fliptop%20game",
    );
  });

  it("clears input when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchBar initialQuery="to-clear" />);

    await user.click(screen.getByRole("button", { name: /clear query/i }));

    expect(screen.getByPlaceholderText(/search lines/i)).toHaveValue("");
  });

  it("navigates when a transcript suggestion is clicked", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            phrase: "fliptop bars",
            query: "fliptop bars",
            lineCount: 42,
          },
        ],
      }),
    });

    render(<SearchBar />);

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "f");

    expect(await screen.findByText("fliptop bars")).toBeInTheDocument();
    await user.click(screen.getByText("fliptop bars"));

    expect(mockPush).toHaveBeenCalledWith("/search?q=fliptop%20bars");
  });
});
