"use client";

import { SearchResult } from "@/lib/types";
import EditLineModal from "./EditLineModal";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Calendar, Play, Pencil } from "lucide-react";

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
            className="rounded-sm bg-blue-300/30 px-0.5 text-foreground"
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

  return (
    <>
      <Card className="group transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600">
        <CardContent className="p-5">
          {/* Line content */}
          <p className="text-lg font-medium leading-relaxed text-card-foreground">
            &ldquo;
            <HighlightedText text={result.content} query={query} />
            &rdquo;
          </p>

          {/* Meta info */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {/* Emcee */}
            <span className="inline-flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="font-semibold text-foreground">
                {result.emcee?.name || result.speaker_label || "Unknown"}
              </span>
            </span>

            {/* Battle */}
            <Link
              href={`/battle/${result.battle.id}`}
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline hover:text-foreground transition-colors"
            >
              <Calendar className="h-4 w-4" />
              {result.battle.title}
            </Link>

            {/* Round */}
            {result.round_number && (
              <Badge variant="secondary">Round {result.round_number}</Badge>
            )}

            {/* Event & Date */}
            {result.battle.event_name && (
              <span>{result.battle.event_name}</span>
            )}
            {result.battle.event_date && (
              <span>{formatDate(result.battle.event_date)}</span>
            )}

            {/* Timestamp */}
            <span className="font-mono text-xs">
              {formatTime(result.start_time)}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3">
            <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
              <a href={ytLink} target="_blank" rel="noopener noreferrer">
                <Play className="h-4 w-4" />
                Play at {formatTime(result.start_time)}
              </a>
            </Button>

            {/* Edit button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!isLoggedIn) {
                  window.location.href = "/login";
                  return;
                }
                setShowEdit(true);
              }}
              title={isLoggedIn ? "Edit this line" : "Login to edit"}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

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
