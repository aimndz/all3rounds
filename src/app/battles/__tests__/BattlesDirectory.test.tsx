import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

type ChildrenProps = { children?: ReactNode };
type SelectProps = ChildrenProps & {
  value?: string;
  onValueChange?: (value: string) => void;
};
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: string;
  asChild?: boolean;
};
type FilterSearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  onClear?: () => void;
  loading?: boolean;
  resultsLabel?: string;
  inputSize?: string;
};
type DialogProps = ChildrenProps & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useBattlesData: vi.fn(),
  useSuperadminActions: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () =>
    new URLSearchParams(
      "q=loonie+vs+abra&status=reviewed&year=2024&sort=oldest&page=2",
    ),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: () => ({
    canEditBattleStatus: false,
    isSuperAdmin: false,
  }),
}));

vi.mock("@/features/battles/hooks/use-battles-data", () => ({
  useBattlesData: mocks.useBattlesData,
}));

vi.mock("@/features/battles/hooks/use-superadmin-actions", () => ({
  useSuperadminActions: mocks.useSuperadminActions,
}));

vi.mock("@/features/battles/components/EventSection", () => ({
  EventSection: () => null,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: SelectProps) => (
    <select
      data-testid="directory-select"
      value={value}
      onChange={(event) => onValueChange?.(event.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: ChildrenProps) => children,
  SelectItem: ({ value, children }: SelectProps) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/page-shell", () => ({
  PageShell: ({ children }: ChildrenProps) => <main>{children}</main>,
}));

vi.mock("@/components/StickyPageHeader", () => ({
  StickyPageHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: ChildrenProps) => <>{children}</>,
  SheetContent: ({ children }: ChildrenProps) => <>{children}</>,
  SheetTitle: () => null,
  SheetTrigger: ({ children }: ChildrenProps) => <>{children}</>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant: _variant, size: _size, asChild: _asChild, ...props }: ButtonProps) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/filter-search-input", () => ({
  FilterSearchInput: ({
    onClear: _onClear,
    loading: _loading,
    resultsLabel: _resultsLabel,
    inputSize: _inputSize,
    ...props
  }: FilterSearchInputProps) => <input {...props} />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: DialogProps) => <>{children}</>,
  DialogContent: ({ children }: ChildrenProps) => <>{children}</>,
  DialogDescription: ({ children }: ChildrenProps) => <>{children}</>,
  DialogFooter: ({ children }: ChildrenProps) => <>{children}</>,
  DialogHeader: ({ children }: ChildrenProps) => <>{children}</>,
  DialogTitle: ({ children }: ChildrenProps) => <>{children}</>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <span />,
}));

vi.mock("@/components/admin/DataPagination", () => ({
  DataPagination: () => null,
}));

vi.mock("@/components/StatusBadge", () => ({
  STATUS_CONFIG: {},
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

import BattlesDirectory from "../BattlesDirectory";

describe("BattlesDirectory League selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useBattlesData.mockReturnValue({
      battles: [
        {
          id: "battle-1",
          league: "fliptop",
          slug: "battle-1",
          title: "Battle",
          youtube_id: "video-1",
          event_name: "Event",
          event_date: "2024-01-01",
          status: "reviewed",
          url: "/battles/fliptop/battle-1",
        },
      ],
      setBattles: vi.fn(),
      loading: false,
      error: "",
      totalCount: 1,
      totalEvents: 1,
      page: 1,
      paginatedEventGroups: [{ name: "Event", battles: [] }],
      handlePageChange: vi.fn(),
      filter: "loonie vs abra",
      statusFilter: "reviewed",
      yearFilter: "2024",
      leagueFilter: "all",
      sortBy: "oldest",
      searchInput: "loonie vs abra",
      setSearchInput: vi.fn(),
      expandedGroups: new Set(),
      debounceTimerRef: { current: null },
      handleSearchChange: vi.fn(),
      updateSearch: vi.fn(),
      handleToggleGroup: vi.fn(),
      availableYears: ["2024"],
      clearFilters: vi.fn(),
      hasActiveFilters: true,
    });
    mocks.useSuperadminActions.mockReturnValue({});
  });

  it("navigates to a scoped League path while retaining directory filters", () => {
    render(
      <BattlesDirectory
        initialBattles={[]}
        initialCount={1}
        initialTotalEvents={1}
        initialYears={[]}
        initialAvailableLeagues={["fliptop", "motus"]}
      />,
    );

    const leagueSelect = screen
      .getAllByTestId("directory-select")
      .find((select) =>
        Array.from(select.querySelectorAll("option")).some(
          (option) => option.value === "motus",
        ),
      );

    expect(leagueSelect).toBeDefined();
    fireEvent.change(leagueSelect!, { target: { value: "motus" } });

    expect(mocks.push).toHaveBeenCalledWith(
      "/leagues/motus?q=loonie+vs+abra&status=reviewed&year=2024&sort=oldest&page=2",
    );
  });
});
