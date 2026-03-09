"use client";

import { SearchResult } from "@/lib/types";
import EditLineModal from "./EditLineModal";
import SuggestCorrectionModal from "./SuggestCorrectionModal";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/utils";

export default function ResultCard({
  result,
  isLoggedIn,
  isUserLoggedIn = false,
  onEdited,
}: {
  result: SearchResult;
  isLoggedIn: boolean;
  isUserLoggedIn?: boolean;
  onEdited?: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  // ── Logic: Determine Speaker Label ──
  // This intelligently shows the full team for 2v2/3v3 battles,
  // even if the specific line was only tagged with one emcee.
  const speakerLabel = (() => {
    const hasMultipleSpeakers = result.emcees && result.emcees.length > 1;

    // 1. If we already have explicit multiple speakers (from speaker_ids)
    if (hasMultipleSpeakers) {
      return result.emcees!.map((e) => e.name).join(" / ");
    }

    // 2. If we only have one speaker, but it's a team battle (2v2/3v3)
    // Try to find if this speaker belongs to a team label
    const primaryEmceeId = result.emcees?.[0]?.id || result.emcee?.id;
    if (
      primaryEmceeId &&
      result.battle.participants &&
      result.battle.participants.length > 0
    ) {
      const participant = result.battle.participants.find(
        (p) => p.emcee?.id === primaryEmceeId,
      );
      if (participant && participant.label) {
        // Find all other emcees in this same team
        const teamEmcees = result.battle.participants
          .filter((p) => p.label === participant.label && p.emcee)
          .map((p) => p.emcee!.name);

        if (teamEmcees.length > 1) {
          return teamEmcees.join(" / ");
        }
      }
    }

    // 3. Fallback to the single emcee or label
    return (
      result.emcees?.[0]?.name ||
      result.emcee?.name ||
      result.speaker_label ||
      "Unknown"
    );
  })();

  // ── Logic: Construct Battle Matchup Subtitle ──
  // For 2v2/3v3, shows "Team A vs Team B" instead of just the title.
  const battleMatchup = (() => {
    const participants = result.battle.participants;
    if (!participants || participants.length === 0) return result.battle.title;

    // Group participants by label (e.g. Left, Right)
    const groupsMap: Record<string, string[]> = {};
    participants.forEach((p) => {
      const l = p.label || "unknown";
      if (!groupsMap[l]) groupsMap[l] = [];
      if (p.emcee) groupsMap[l].push(p.emcee.name);
    });

    // Convert map to sorted parts to maintain consistent order
    const labels = Object.keys(groupsMap).sort();
    if (labels.length < 2) return result.battle.title;

    const teamStrings = labels
      .map((l) => groupsMap[l].join(" / "))
      .filter((s) => s.length > 0);

    if (teamStrings.length < 2) return result.battle.title;
    return teamStrings.join(" vs ");
  })();

  const router = useRouter();

  return (
    <>
      <div
        onClick={() =>
          router.push(
            `/battle/${result.battle.id}?t=${Math.floor(result.start_time)}`,
          )
        }
        className="group hover:bg-muted/30 block cursor-pointer py-4 transition-colors sm:-mx-4 sm:rounded-xl sm:px-4"
      >
        <div className="flex gap-4 sm:gap-6">
          {/* Thumbnail */}
          <div className="bg-muted relative mt-1 hidden aspect-video w-36 shrink-0 self-start overflow-hidden rounded-md sm:block">
            <Image
              src={`https://img.youtube.com/vi/${result.battle.youtube_id}/mqdefault.jpg`}
              alt={result.battle.title}
              fill
              sizes="144px"
              className="object-cover"
              unoptimized
            />
            {/* Timestamp badge */}
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white shadow-sm">
              {formatTime(result.start_time)}
            </span>
          </div>

          {/* Content */}
          <div className="relative flex flex-1 flex-col justify-center">
            {/* Action Buttons (Edit/Suggest) */}
            <div className="absolute top-0 right-0 flex items-center">
              {isLoggedIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEdit(true);
                  }}
                  className="text-muted-foreground hover:bg-primary/0 hover:text-foreground h-8 w-8"
                  title="Edit this line"
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
              )}
              {isUserLoggedIn && !isLoggedIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSuggest(true);
                  }}
                  className="text-muted-foreground hover:bg-primary/10 hover:text-primary h-8 w-8"
                  title="Suggest a correction"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Speaker & Context Header */}
            <div className="mb-5 pr-10">
              <span className="text-primary/80 text-[15px] font-black uppercase">
                {speakerLabel}
              </span>
              <div className="text-muted-foreground/60 group-hover:text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium transition-colors">
                <span>{battleMatchup}</span>
                {result.battle.event_name && (
                  <>
                    <span className="opacity-30">·</span>
                    <span>{result.battle.event_name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Line Content with Prev/Next context */}
            <div className="relative border-l border-white/10 py-0.5 pl-4">
              <div className="flex flex-col gap-1">
                {result.prev_line && (
                  <p className="text-muted-foreground/30 group-hover:text-muted-foreground/50 line-clamp-1 text-[14px] leading-tight font-medium transition-colors">
                    {result.prev_line.content}
                  </p>
                )}

                <div className="relative">
                  <div className="bg-primary/40 absolute top-1/2 -left-4.25 h-3 w-0.5 -translate-y-1/2 rounded-full" />
                  <p className="text-foreground text-[15px] leading-relaxed font-semibold sm:text-[16px]">
                    {result.content}
                  </p>
                </div>

                {result.next_line && (
                  <p className="text-muted-foreground/30 group-hover:text-muted-foreground/50 line-clamp-1 text-[14px] leading-tight font-medium transition-colors">
                    {result.next_line.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditLineModal
          result={result}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            onEdited?.();
          }}
        />
      )}

      {showSuggest && (
        <SuggestCorrectionModal
          result={result}
          onClose={() => setShowSuggest(false)}
        />
      )}
    </>
  );
}
