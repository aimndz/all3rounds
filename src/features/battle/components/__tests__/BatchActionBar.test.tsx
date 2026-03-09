import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BatchActionBar from "../BatchActionBar";

describe("BatchActionBar", () => {
  const mockOnAction = vi.fn().mockResolvedValue(undefined);
  const mockOnClear = vi.fn();
  const mockParticipants = [
    { label: "P1", emcee: { id: "e1", name: "Loonie" } },
    { label: "P2", emcee: { id: "e2", name: "Smugglaz" } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders selected count correctly", () => {
    render(
      <BatchActionBar
        selectedCount={5}
        selectedIds={new Set([1, 2, 3, 4, 5])}
        onAction={mockOnAction}
        onClear={mockOnClear}
        saving={false}
      />
    );

    expect(screen.getByText(/5 lines/i)).toBeInTheDocument();
  });

  it("toggles round selection correctly", () => {
    render(
      <BatchActionBar
        selectedCount={1}
        selectedIds={new Set([1])}
        onAction={mockOnAction}
        onClear={mockOnClear}
        saving={false}
      />
    );

    const r1Button = screen.getByText("R1");
    
    // Initial state: Apply button hidden
    expect(screen.queryByText("Apply")).not.toBeInTheDocument();

    // Select R1
    fireEvent.click(r1Button);
    expect(screen.getByText("Apply")).toBeInTheDocument();

    // Unselect R1 (click again)
    fireEvent.click(r1Button);
    expect(screen.queryByText("Apply")).not.toBeInTheDocument();
  });

  it("calls onAction with combined updates when Apply is clicked", async () => {
    render(
      <BatchActionBar
        selectedCount={1}
        selectedIds={new Set([1])}
        participants={mockParticipants}
        onAction={mockOnAction}
        onClear={mockOnClear}
        saving={false}
      />
    );

    fireEvent.click(screen.getByText("R2"));
    fireEvent.click(screen.getByText("Smugglaz"));

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    expect(mockOnAction).toHaveBeenCalledWith({
      action: "update",
      updates: {
        round_number: 2,
        emcee_id: "e2",
      },
    });
  });

  it("shows delete confirmation dialog when Delete is clicked", () => {
    render(
      <BatchActionBar
        selectedCount={1}
        selectedIds={new Set([1])}
        onAction={mockOnAction}
        onClear={mockOnClear}
        saving={false}
        canDelete={true}
      />
    );

    const deleteButton = screen.getByText(/Delete/i);
    fireEvent.click(deleteButton);

    expect(screen.getByText(/Delete 1 line\?/i)).toBeInTheDocument();
  });

  it("calls onClear when Cancel/Clear is clicked", () => {
    render(
      <BatchActionBar
        selectedCount={1}
        selectedIds={new Set([1])}
        onAction={mockOnAction}
        onClear={mockOnClear}
        saving={false}
      />
    );

    // Cancel is mapped to onClear
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(mockOnClear).toHaveBeenCalled();
  });

  it("disables buttons while saving", () => {
    render(
      <BatchActionBar
        selectedCount={1}
        selectedIds={new Set([1])}
        onAction={mockOnAction}
        onClear={mockOnClear}
        saving={true}
      />
    );

    expect(screen.getByText("R1")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
  });
});
