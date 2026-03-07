import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, STATUS_CONFIG } from "../StatusBadge";
import type { BattleStatus } from "@/lib/types";

describe("StatusBadge", () => {
  const statuses: BattleStatus[] = ["raw", "arranged", "reviewing", "reviewed"];

  it.each(statuses)("renders correct label for status '%s'", (status) => {
    render(<StatusBadge status={status} noTooltip />);
    expect(screen.getByText(STATUS_CONFIG[status].label)).toBeInTheDocument();
  });

  it("defaults to 'raw' config for falsy status", () => {
    render(<StatusBadge status={undefined as any} noTooltip />);
    expect(screen.getByText("Raw")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusBadge status="reviewed" noTooltip className="custom-class" />,
    );
    const badge = container.querySelector(".custom-class");
    expect(badge).toBeInTheDocument();
  });
});
