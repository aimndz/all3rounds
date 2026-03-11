import { useState } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";
import YouTubeLoopPlayer from "@/components/YouTubeLoopPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Loader2,
  Clock,
  ExternalLink,
  UndoIcon,
} from "lucide-react";

/** Shared type matching API response */
export type SuggestionLog = {
  id: string;
  line_id: number;
  user_id: string;
  suggested_content: string;
  original_content: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  review_note?: string | null;
  reviewer?: { display_name: string } | null;
  user: { display_name: string } | null;
  lines: {
    content: string;
    start_time: number;
    end_time: number;
    battle: { id: string; title: string; youtube_id: string };
  };
};

interface SuggestionCardProps {
  suggestion: SuggestionLog;
  variant: "review" | "audit";
  onAction?: (id: string, action: "approve" | "reject", currentStatus?: string) => void;
  processingId?: string | null;
}

export function SuggestionCard({ suggestion: s, variant, onAction, processingId }: SuggestionCardProps) {
  const [playerKey, setPlayerKey] = useState(0);
  
  const reloadPlayer = () => setPlayerKey((p) => p + 1);
  const isProcessing = processingId === s.id;

  // Audit state classes
  const borderColor = 
    variant === "audit" && s.status === "approved" ? "border-primary/20" :
    variant === "audit" && s.status === "rejected" ? "border-destructive/20" : 
    "border-white/5 hover:border-primary/40 focus-within:border-primary/40";
    
  return (
    <div className={`group relative flex flex-col gap-0 overflow-hidden rounded-3xl border bg-[#141417] transition-all duration-500 md:flex-row ${borderColor}`}>
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black md:w-[320px]">
        <YouTubeLoopPlayer
          key={`${s.id}-${playerKey}`}
          videoId={s.lines.battle.youtube_id}
          startTime={s.lines.start_time}
          endTime={s.lines.end_time}
          autoplay={playerKey > 0}
          className="absolute inset-0 h-full w-full grayscale-[0.3] transition-all duration-700 group-hover:grayscale-0 focus-within:grayscale-0"
          playerKey={playerKey}
        />
      </div>

      <div className="flex flex-1 flex-col p-6 lg:px-8">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex flex-col gap-1 pr-4">
            <Link
              href={`/battle/${s.lines.battle.id}?t=${Math.floor(s.lines.start_time)}`}
              target="_blank"
              title="View Full Battle"
              className="text-primary/60 hover:text-primary focus:text-primary flex items-center gap-1.5 font-bold tracking-wider transition-all active:scale-95"
            >
              <span className="line-clamp-1">{s.lines.battle.title.toUpperCase()}</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={reloadPlayer}
                className="hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:ring-1 focus:ring-primary flex h-6 w-fit items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-white/60 transition-all active:scale-95 outline-none"
                title="Replay Segment"
              >
                <Clock className="h-2.5 w-2.5" />
                <span className="text-[9px] font-semibold">
                  {formatTime(s.lines.start_time)}-{formatTime(s.lines.end_time)}
                </span>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 text-right shrink-0">
            {variant === "audit" && (
              <Badge variant="outline" className={`rounded px-2 py-0.5 mb-1 border-transparent text-[9px] font-semibold tracking-wider uppercase ${s.status === "approved" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                {s.status}
              </Badge>
            )}
            
            {variant === "audit" ? (
              <>
                <p className="text-[10px] font-bold text-white/40">
                  Reviewed by: <span className="text-white">{s.reviewer?.display_name || "Unknown"}</span>
                </p>
                <p className="text-[9px] font-bold text-white/20">
                  Suggested by: {s.user?.display_name || "Anon"}
                </p>
              </>
            ) : (
              <>
                <p className="text-[9px] font-bold whitespace-nowrap text-white/20">
                  SUBMITTED_BY: {s.user?.display_name?.toUpperCase() || "ANON"}
                </p>
                <p className="text-[10px] font-semibold text-white/10">
                  S_#{s.line_id.toString().padStart(4, "0")}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-1">
            <span className="text-[8px] font-semibold tracking-[0.2em] text-white/20 uppercase">
              {variant === "audit" ? "ORIGINAL" : "CURRENT"}
            </span>
            <p className={`border-l-2 pl-3 text-sm leading-relaxed font-medium transition-colors ${
              variant === "audit" && s.status === "rejected" ? "border-primary/50 text-white" : 
              variant === "audit" ? "border-white/5 text-white/40 line-through" :
              "border-white/5 text-white/40"
            }`}>
               {variant === "review" ? `"${s.original_content}"` : s.original_content}
            </p>
          </div>
          <div className="relative space-y-1">
            <span className={`text-[8px] font-semibold tracking-[0.2em] uppercase ${variant === "review" ? "text-primary/60" : "text-white/20"}`}>
              SUGGESTION
            </span>
            <p className={`border-l-2 pl-3 text-base leading-snug font-semibold tracking-tight transition-all ${
              variant === "review" ? "text-white border-primary" :
              s.status === "approved" ? "text-primary border-primary" : 
              "decoration-destructive/50 border-white/5 text-white/40 line-through"
            }`}>
              {s.suggested_content}
            </p>
          </div>
          
          {variant === "audit" && s.review_note && (
            <div className="mt-2 text-xs whitespace-pre-wrap text-white/60 bg-white/5 rounded-xl p-3 border border-white/5">
              <span className="mr-2 text-[10px] font-bold text-white/40 uppercase">Note:</span>
              {s.review_note}
            </div>
          )}
        </div>

        {/* Actions Row */}
        {onAction && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-5">
            {variant === "review" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction(s.id, "reject")}
                  disabled={isProcessing}
                  className="hover:bg-destructive/10 hover:text-destructive h-8 rounded-xl px-4 text-[10px] font-semibold tracking-widest text-white/40 uppercase transition-all"
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAction(s.id, "approve")}
                  disabled={isProcessing}
                  className="shadow-primary/10 bg-primary hover:bg-primary/90 h-8 rounded-xl px-6 text-[10px] font-semibold text-black uppercase shadow-lg transition-all active:scale-95"
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                  Approve
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(s.id, "approve", s.status)} // 'approve' means 'override' functionally here, we pass current status
                disabled={isProcessing}
                className="h-8 rounded-xl border-white/10 bg-transparent px-4 text-[10px] font-semibold tracking-widest text-white uppercase transition-all hover:bg-white/10 hover:text-white"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                ) : (
                  <>
                    <UndoIcon className="mr-2 h-3 w-3" />
                    Override to {s.status === "approved" ? "Rejection" : "Approval"}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
