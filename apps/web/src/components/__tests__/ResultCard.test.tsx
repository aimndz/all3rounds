import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SearchResult } from "@/lib/types";

// Mock next/navigation and next/image
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

import ResultCard from "../ResultCard";

const baseResult: SearchResult = {
  id: 1,
  content: "Ang galing mo mag rap",
  start_time: 120,
  end_time: 125,
  round_number: 1,
  speaker_label: "SPEAKER_00",
  emcee: { id: "e1", name: "Loonie" },
  battle: {
    id: "b1",
    title: "Loonie vs Mhot",
    youtube_id: "abc123",
    event_name: "FlipTop Festival",
    event_date: "2024-06-15",
    url: "https://youtube.com/watch?v=abc123",
    status: "reviewed",
  },
  prev_line: {
    id: 0,
    content: "Previous line content",
    speaker_label: "SPEAKER_01",
    round_number: 1,
  },
  next_line: {
    id: 2,
    content: "Next line content",
    speaker_label: "SPEAKER_00",
    round_number: 1,
  },
};

describe("ResultCard", () => {
  it("renders the line content", () => {
    render(<ResultCard result={baseResult} isLoggedIn={false} />);
    expect(screen.getByText("Ang galing mo mag rap")).toBeInTheDocument();
  });

  it("renders emcee name as speaker", () => {
    render(<ResultCard result={baseResult} isLoggedIn={false} />);
    expect(screen.getByText("Loonie")).toBeInTheDocument();
  });

  it("renders battle title", () => {
    render(<ResultCard result={baseResult} isLoggedIn={false} />);
    expect(screen.getByText("Loonie vs Mhot")).toBeInTheDocument();
  });

  it("renders event name", () => {
    render(<ResultCard result={baseResult} isLoggedIn={false} />);
    expect(screen.getByText("FlipTop Festival")).toBeInTheDocument();
  });

  it("renders context lines", () => {
    render(<ResultCard result={baseResult} isLoggedIn={false} />);
    expect(screen.getByText("Previous line content")).toBeInTheDocument();
    expect(screen.getByText("Next line content")).toBeInTheDocument();
  });

  it("shows edit button when logged in with edit permission", () => {
    render(<ResultCard result={baseResult} isLoggedIn={true} />);
    expect(screen.getByTitle("Edit this line")).toBeInTheDocument();
  });

  it("does not show edit button when not logged in", () => {
    render(<ResultCard result={baseResult} isLoggedIn={false} />);
    expect(screen.queryByTitle("Edit this line")).not.toBeInTheDocument();
  });

  it("shows suggest button when logged in as viewer (isUserLoggedIn but not isLoggedIn)", () => {
    render(
      <ResultCard
        result={baseResult}
        isLoggedIn={false}
        isUserLoggedIn={true}
      />,
    );
    expect(screen.getByTitle("Suggest a correction")).toBeInTheDocument();
  });

  it("falls back to speaker_label when no emcee", () => {
    const noEmceeResult = { ...baseResult, emcee: null };
    render(<ResultCard result={noEmceeResult} isLoggedIn={false} />);
    expect(screen.getByText("SPEAKER_00")).toBeInTheDocument();
  });
});
