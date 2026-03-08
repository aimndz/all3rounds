import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmceeCard } from "../EmceeCard";
import { Emcee } from "../../types";

const mockEmcee: Emcee = {
  id: "1",
  name: "Loonie",
  aka: ["Luni"],
  battle_count: 50,
};

describe("EmceeCard", () => {
  it("renders emcee name and battle count", () => {
    render(<EmceeCard emcee={mockEmcee} />);
    
    expect(screen.getByText("Loonie")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText(/Battles/i)).toBeInTheDocument();
  });

  it("links to the correct profile page", () => {
    render(<EmceeCard emcee={mockEmcee} />);
    
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/emcees/1");
  });
});
