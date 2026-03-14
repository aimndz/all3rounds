"use client";

import { SearchResult } from "@/lib/types";
import EditLineModal from "./EditLineModal";
import SuggestCorrectionModal from "./SuggestCorrectionModal";
import { useState } from "react";
import { LoginModal } from "./LoginModal";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatTime, formatSpeakerName } from "@/lib/utils";

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const router = useRouter();

  // Determine the most descriptive speaker label (handles teams for 2v2/3v3)
  const speakerLabel = (() => {
    const hasMultipleSpeakers = result.emcees && result.emcees.length > 1;

    if (hasMultipleSpeakers) {
      return result.emcees!.map((e) => formatSpeakerName(e.name)).join(" / ");
    }

    const primaryEmceeId = result.emcees?.[0]?.id || result.emcee?.id;
    const participants = result.battle.participants;
    if (primaryEmceeId && participants && participants.length > 0) {
      const participant = participants.find(
        (p) => p.emcee?.id === primaryEmceeId,
      );
      if (participant?.label) {
        const teamEmcees = participants
          .filter((p) => p.label === participant.label && p.emcee)
          .map((p) => formatSpeakerName(p.emcee!.name));

        if (teamEmcees.length > 1) return teamEmcees.join(" / ");
      }
    }

    return formatSpeakerName(
      result.emcees?.[0]?.name ||
        result.emcee?.name ||
        result.speaker_label ||
        "Unassigned",
    );
  })();

  // Build the matchup subtitle (e.g., "Emcee A vs Emcee B")
  const battleMatchup = (() => {
    const participants = result.battle.participants;
    if (!participants || participants.length === 0) return result.battle.title;

    const groupsMap: Record<string, string[]> = {};
    participants.forEach((p) => {
      const l = p.label || "unknown";
      if (!groupsMap[l]) groupsMap[l] = [];
      if (p.emcee) groupsMap[l].push(p.emcee.name);
    });

    const labels = Object.keys(groupsMap).sort();
    if (labels.length < 2) return result.battle.title;

    const teamStrings = labels
      .map((l) => groupsMap[l].join(" / "))
      .filter((s) => s.length > 0);

    return teamStrings.length < 2 ? result.battle.title : teamStrings.join(" vs ");
  })();

  return (
    <>
      <div
        onClick={() => router.push(`/battle/${result.battle.id}?t=${Math.floor(result.start_time)}`)}
        className="group hover:bg-muted/30 relative block cursor-pointer py-4 transition-colors sm:-mx-4 sm:rounded-xl sm:px-4"
      >
        {/* Action Controls */}
        <div className="absolute top-3 right-0 z-40 flex items-center sm:top-4 sm:right-4">
          {isLoggedIn ? (
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
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isUserLoggedIn) setShowSuggest(true);
                else setIsLoginModalOpen(true);
              }}
              className="text-muted-foreground hover:bg-primary/10 hover:text-primary h-8 w-8"
              title={isUserLoggedIn ? "Suggest a correction" : "Login to suggest correction"}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3.5 sm:flex-row sm:gap-6">
          <div className="flex items-start gap-3.5 sm:contents">
            {/* Thumbnail Image */}
            <div className="bg-muted relative mt-1 aspect-video w-24 shrink-0 self-start overflow-hidden rounded-lg shadow-sm transition-all duration-300 group-hover:scale-105 sm:w-36 sm:rounded-md">
              <Image
                src={`https://img.youtube.com/vi/${result.battle.youtube_id}/mqdefault.jpg`}
                alt={result.battle.title}
                fill
                sizes="(max-width: 640px) 96px, 144px"
                className="object-cover"
                unoptimized
              />
              <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-sm sm:right-1.5 sm:bottom-1.5 sm:text-[10px]">
                {formatTime(result.start_time)}
              </span>
            </div>

            {/* Mobile Metadata (Row 1 alignment) */}
            <div className="flex min-w-0 flex-1 flex-col pt-0.5 pr-8 sm:hidden">
              {speakerLabel && (
                <span className="text-primary/80 mb-1 truncate text-[15px] font-black uppercase">
                  {speakerLabel}
                </span>
              )}
              <div className="text-muted-foreground/60 flex flex-col gap-0.5 text-[13px] font-medium transition-colors">
                <span className="line-clamp-1">{battleMatchup}</span>
                {result.battle.event_name && (
                  <span className="line-clamp-1">{result.battle.event_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Content & Mobile Transcription Row */}
          <div className="relative flex min-w-0 flex-1 flex-col justify-center">
            {/* Desktop-only Metadata Header */}
            <div className={cn("hidden sm:block pr-10", speakerLabel ? "mb-5" : "mb-2")}>
              {speakerLabel && (
                <span className="text-primary/80 block truncate text-[15px] font-black uppercase">
                  {speakerLabel}
                </span>
              )}
              <div className="text-muted-foreground/60 group-hover:text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium transition-colors">
                <span className="truncate">{battleMatchup}</span>
                {result.battle.event_name && (
                  <>
                    <span className="shrink-0 opacity-30">·</span>
                    <span className="truncate">{result.battle.event_name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Transcription Snippet */}
            <div className="border-primary/25 relative border-l-2 py-0.5 pl-4">
              <div className="flex flex-col gap-1">
                {result.prev_line && (
                  <p className="text-muted-foreground/30 group-hover:text-muted-foreground/50 line-clamp-1 text-[14px] font-medium transition-colors">
                    {result.prev_line.content}
                  </p>
                )}
                <p className="text-foreground line-clamp-3 text-[15px] font-semibold leading-relaxed sm:text-[16px]">
                  {result.content}
                </p>
                {result.next_line && (
                  <p className="text-muted-foreground/30 group-hover:text-muted-foreground/50 line-clamp-1 text-[14px] font-medium transition-colors">
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

      <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </>
  );
}
