"use client";

import { SearchResult } from "@/lib/types";
import EditLineModal from "./EditLineModal";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Play, Pencil, Mic2 } from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded-sm bg-primary/20 px-0.5 font-semibold text-primary"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function ResultCard({
  result,
  isLoggedIn,
  onEdited,
  query = "",
}: {
  result: SearchResult;
  isLoggedIn: boolean;
  onEdited?: () => void;
  query?: string;
}) {
  const [showEdit, setShowEdit] = useState(false);

  const ytLink = `https://www.youtube.com/watch?v=${result.battle.youtube_id}&t=${Math.floor(result.start_time)}s`;
  const speaker = result.emcee?.name || result.speaker_label || "Unknown";

  return (
    <>
      <Link
        href={`/battle/${result.battle.id}`}
        className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/60"
      >
        <div className="relative flex min-h-[120px]">
          {/* Thumbnail — flush left, fills height */}
          <div className="relative hidden w-44 shrink-0 sm:block">
            <Image
              src={`https://img.youtube.com/vi/${result.battle.youtube_id}/mqdefault.jpg`}
              alt={result.battle.title}
              fill
              sizes="176px"
              className="object-cover"
            />
            {/* Gradient fade from image to content */}
            <div className="absolute inset-y-0 right-0 w-16 bg-linear-to-r from-transparent to-card" />
            {/* Timestamp badge */}
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
              {formatTime(result.start_time)}
            </span>
          </div>

          {/* Content */}
          <div className="relative flex flex-1 flex-col justify-center px-4 py-4 sm:px-5">
            {/* Line text */}
            <p className="text-[15px] leading-relaxed text-foreground">
              &ldquo;
              <HighlightedText text={result.content} query={query} />
              &rdquo;
            </p>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                <Mic2 className="h-3 w-3 text-muted-foreground" />
                {speaker}
              </span>
              <span className="text-border">·</span>
              <span>{result.battle.title}</span>
              {result.round_number && (
                <>
                  <span className="text-border">·</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    Round {result.round_number}
                  </span>
                </>
              )}
              {result.battle.event_name && (
                <>
                  <span className="text-border">·</span>
                  <span>{result.battle.event_name}</span>
                </>
              )}
              {result.battle.event_date && (
                <>
                  <span className="text-border">·</span>
                  <span>{formatDate(result.battle.event_date)}</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(ytLink, "_blank", "noopener,noreferrer");
                }}
                className="h-7 gap-1.5 bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-80"
              >
                <Play className="h-3 w-3" />
                Play at {formatTime(result.start_time)}
              </Button>

              {isLoggedIn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEdit(true);
                  }}
                  className="h-7 gap-1.5 border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Edit this line"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Edit modal */}
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
    </>
  );
}
