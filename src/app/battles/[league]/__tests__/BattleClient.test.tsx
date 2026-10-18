import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  fetchBattle: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ league: "motus", slug: "sample-battle" }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" {...props} />
  ),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: () => ({
    isUserLoggedIn: false,
    canEdit: false,
    canEditBattleStatus: false,
    canDelete: false,
  }),
}));

vi.mock("@/features/battles/hooks/use-battle-data", () => ({
  useBattleData: () => ({
    data: {
      battle: {
        id: "battle-1",
        league: "motus",
        slug: "sample-battle",
        title: "Sample Battle",
        youtube_id: "video-1",
        event_name: "Sample Event",
        event_date: "2024-01-01",
        url: "https://www.youtube.com/watch?v=video-1",
        status: "reviewed",
      },
      participants: [],
      lines: [],
    },
    setData: vi.fn(),
    loading: false,
    loadingMore: false,
    loadingPrevious: false,
    hasMore: false,
    hasPrevious: false,
    error: "",
    fetchBattle: mocks.fetchBattle,
    fetchMoreLines: vi.fn(),
    fetchPreviousLines: vi.fn(),
  }),
}));

vi.mock("@/features/battles/hooks/use-youtube-player", () => ({
  useYouTubePlayer: () => ({
    player: null,
    activeTime: 0,
    playerRef: { current: null },
    seekTo: vi.fn(),
  }),
}));

vi.mock("@/features/battles/hooks/use-line-selection", () => ({
  useLineSelection: () => ({
    selectedIds: new Set(),
    setSelectedIds: vi.fn(),
    lastClickedLineId: null,
    setLastClickedLineId: vi.fn(),
    toggleSelect: vi.fn(),
    toggleSelectTurn: vi.fn(),
    toggleSelectRound: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock("@/features/battles/hooks/use-inline-edit", () => ({
  useInlineEdit: () => ({
    inlineEditingId: null,
    setInlineEditingId: vi.fn(),
    inlineContent: "",
    setInlineContent: vi.fn(),
    startInlineEdit: vi.fn(),
    handleInlineSave: vi.fn(),
  }),
}));

vi.mock("@/features/battles/hooks/use-auto-scroll", () => ({
  useAutoScroll: () => ({ transcriptContainerRef: { current: null } }),
}));

vi.mock("@/components/Footer", () => ({
  default: () => null,
}));

vi.mock("@/features/battles/components/BatchActionBar", () => ({
  default: () => null,
}));

vi.mock("@/features/battles/components/LineItem", () => ({
  LineItem: () => null,
}));

vi.mock("@/features/battles/components/InlineBattleStatusSelect", () => ({
  InlineBattleStatusSelect: () => null,
}));

import BattleClient from "../BattleClient";

describe("BattleClient League return navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
  });

  it("uses the loaded Battle League for the breadcrumb and no-history fallback", () => {
    render(<BattleClient battleId="battle-1" />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      breadcrumb.querySelector('a[href="/leagues/motus"]'),
    ).toHaveTextContent("Motus");

    fireEvent.click(screen.getByRole("button", { name: "Back to Motus" }));

    expect(mocks.push).toHaveBeenCalledWith("/leagues/motus");
    expect(mocks.back).not.toHaveBeenCalled();
  });
});
