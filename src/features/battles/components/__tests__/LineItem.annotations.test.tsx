import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LineItem } from "@/features/battles/components/LineItem";
import type { BattleLine } from "@/features/battles/hooks/use-battle-data";

const line: BattleLine = {
  id: 101,
  content: "This is a punchline with context.",
  start_time: 12,
  end_time: 14,
  round_number: 1,
  speaker_label: "SPEAKER_01",
  emcee: null,
  annotation_count: 2,
};

function renderLine(overrides?: Partial<Parameters<typeof LineItem>[0]>) {
  const props: Parameters<typeof LineItem>[0] = {
    line,
    editMode: false,
    isSelected: false,
    isActive: false,
    isLastClicked: false,
    inlineEditingId: null,
    inlineContent: "",
    onToggleSelect: vi.fn(),
    onStartInlineEdit: vi.fn(),
    onInlineSave: vi.fn(),
    onSetInlineEditingId: vi.fn(),
    onSetInlineContent: vi.fn(),
    onSeek: vi.fn(),
    onEditClick: vi.fn(),
    onSuggestClick: vi.fn(),
    onAddClick: vi.fn(),
    onAnnotationSelect: vi.fn(),
    canEdit: false,
    isAnnotated: true,
    annotationCount: 2,
    isAnnotationSelected: false,
    ...overrides,
  };

  render(<LineItem {...props} />);
  return props;
}

describe("LineItem annotation behavior", () => {
  it("does not show a side annotation count affordance on annotated lines", () => {
    renderLine();

    expect(screen.queryByTitle("2 annotations")).not.toBeInTheDocument();
  });

  it("selects a line for annotation instead of seeking when annotation selection is enabled", async () => {
    const user = userEvent.setup();
    const onAnnotationSelect = vi.fn();
    const onSeek = vi.fn();
    renderLine({ onAnnotationSelect, onSeek });

    await user.click(screen.getByText(line.content));

    expect(onAnnotationSelect).toHaveBeenCalledWith(line.id, false);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("keeps timestamp click as seek behavior", async () => {
    const user = userEvent.setup();
    const onAnnotationSelect = vi.fn();
    const onSeek = vi.fn();
    renderLine({ onAnnotationSelect, onSeek });

    await user.click(screen.getByTitle("Seek to 0:12"));

    expect(onSeek).toHaveBeenCalledWith(line.start_time);
    expect(onAnnotationSelect).not.toHaveBeenCalled();
  });

  it("supports pointer drag selection for line highlighting", () => {
    const onAnnotationRangeStart = vi.fn();
    const onAnnotationRangeEnter = vi.fn();
    const onAnnotationRangeEnd = vi.fn();
    renderLine({
      onAnnotationRangeStart,
      onAnnotationRangeEnter,
      onAnnotationRangeEnd,
    });

    const row = screen.getByText(line.content).closest("[data-line-id]");
    expect(row).not.toBeNull();

    fireEvent.pointerDown(row as Element, { button: 0, pointerType: "mouse" });
    fireEvent.pointerEnter(row as Element);
    fireEvent.pointerUp(row as Element);

    expect(onAnnotationRangeStart).toHaveBeenCalledWith(line.id);
    expect(onAnnotationRangeEnter).toHaveBeenCalledWith(line.id);
    expect(onAnnotationRangeEnd).toHaveBeenCalled();
  });

  it("highlights only the selected phrase when a text range is provided", () => {
    renderLine({
      isAnnotationSelected: true,
      annotationTextRange: { start: 10, end: 19 },
    });

    const highlightedPhrase = screen.getByText("punchline");
    expect(highlightedPhrase.tagName).toBe("MARK");
    expect(highlightedPhrase.closest("[data-line-id]")).not.toHaveClass(
      "bg-primary/5",
    );
  });

  it("initially highlights only saved annotation phrase targets", () => {
    renderLine({
      isAnnotationSelected: false,
      annotationTextRanges: [{ start: 10, end: 19, text: "punchline" }],
    });

    const highlightedPhrase = screen.getByText("punchline");
    expect(highlightedPhrase.tagName).toBe("MARK");
    expect(highlightedPhrase).toHaveClass("bg-[#3e3e3e]");
    expect(highlightedPhrase.closest("[data-line-id]")).not.toHaveClass(
      "bg-primary/5",
    );
  });

  it("shows clicked annotation highlights as active in read mode", () => {
    renderLine({
      isLastClicked: true,
      annotationTextRanges: [{ start: 10, end: 19, text: "punchline" }],
    });

    const highlightedPhrase = screen.getByText("punchline");
    expect(highlightedPhrase.closest("[data-line-id]")).not.toHaveClass(
      "bg-primary/10",
    );
    expect(highlightedPhrase).toHaveClass("bg-[#e7e7e7]", "text-black");
  });
});
