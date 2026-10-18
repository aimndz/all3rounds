import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation and next/link
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
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
// Mock AuthButton to avoid Supabase client init
vi.mock("@/components/AuthButton", () => ({
  default: () => <button>Sign In</button>,
}));

import Header from "../Header";

describe("Header", () => {
  it("renders the logo link", () => {
    render(<Header />);
    expect(screen.getByAltText("A3R")).toBeInTheDocument();
  });

  it("renders Leagues in the public navigation", () => {
    render(<Header />);
    expect(screen.getByText(/discover/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leagues" })).toHaveAttribute(
      "href",
      "/leagues",
    );
    expect(screen.queryByText(/^battles$/i)).not.toBeInTheDocument();
  });

  it("keeps Leagues in the mobile navigation drawer", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole("button", { name: /toggle menu/i }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Leagues");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Battles");
  });

  it('links the logo to "/"', () => {
    render(<Header />);
    const logo = screen.getByAltText("A3R").closest("a");
    expect(logo).toHaveAttribute("href", "/");
  });
});
