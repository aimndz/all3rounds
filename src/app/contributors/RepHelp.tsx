"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { REP_PER_APPROVED_TRANSCRIPT } from "@/lib/contributor-leaderboard";

export function RepHelp() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground rounded-full transition-colors"
        aria-label="How REP works"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        <HelpCircle className="size-5" aria-hidden="true" />
      </button>
      {open ? (
        <span className="bg-foreground text-background absolute top-7 left-1/2 z-20 w-72 -translate-x-1/2 rounded-md px-3 py-2 text-xs leading-5 shadow-lg">
          REP is reputation. Each admin-approved transcript earns{" "}
          {REP_PER_APPROVED_TRANSCRIPT} REP, with future annotation upvotes
          adding even more.
        </span>
      ) : null}
    </span>
  );
}
