"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Edit3,
  HelpCircle,
  MessageSquareText,
  MoreHorizontal,
  Triangle,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  BattleData,
  BattleLine,
} from "@/features/battles/hooks/use-battle-data";

const ANNOTATION_MIN_BODY_LENGTH = 3;

type Annotation = {
  id: string;
  battle_id: string;
  author_id: string;
  body_text: string;
  body_json: unknown;
  status: string;
  score: number;
  quality_state: string;
  current_user_voted: boolean;
  can_edit: boolean;
  created_at: string | number;
  author: {
    display_name: string;
    username: string | null;
    image_url: string | null;
    role: string;
    trust_level: string;
    points: number;
  };
  references: {
    id: string;
    line_id: number | null;
    label: string;
  }[];
};

type AnnotationPanelProps = {
  battle: BattleData["battle"];
  selectedLines: BattleLine[];
  selectedTextTargets?: {
    lineId: number;
    start: number;
    end: number;
    text: string;
  }[];
  open: boolean;
  mobileOpen: boolean;
  className?: string;
  onMobileOpenChange: (open: boolean) => void;
  onClose: () => void;
  onJumpToLine: (lineId: number) => void;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  onAnnotationsChanged?: (
    lineIds: number[],
    delta: number,
    textTargets?: {
      lineId: number;
      start: number;
      end: number;
      text: string;
    }[],
  ) => void;
};

type AnnotationSort = "top" | "newest";

type FetchState = {
  loading: boolean;
  error: string;
  annotations: Annotation[];
};

function toPlainDoc(text: string) {
  return {
    type: "doc",
    content: text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => ({ type: "paragraph", text: paragraph })),
  };
}

function renderInlineText(
  text: string,
  onJumpToLine: (lineId: number) => void,
) {
  const parts = text.split(/(\[\[line:\d+\]\])/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[\[line:(\d+)\]\]$/);
    if (match) {
      const lineId = Number(match[1]);
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          onClick={() => onJumpToLine(lineId)}
          className="text-primary hover:bg-primary/10 mx-0.5 rounded px-1 font-semibold underline-offset-4 hover:underline"
        >
          Line {lineId}
        </button>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function AnnotationBody({
  text,
  onJumpToLine,
}: {
  text: string;
  onJumpToLine: (lineId: number) => void;
}) {
  return (
    <div className="text-foreground/85 space-y-2 text-sm leading-relaxed">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{renderInlineText(paragraph, onJumpToLine)}</p>
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function usernameLabel(annotation: Annotation) {
  const username = annotation.author.username?.trim();
  if (username) return username.startsWith("@") ? username : `@${username}`;
  const fallback = annotation.author.display_name.trim() || "All3Rounds user";
  return fallback.startsWith("@") ? fallback : `@${fallback}`;
}

function formatAnnotationAge(value: string | number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";

  const units = [
    { label: "yr", seconds: 60 * 60 * 24 * 365 },
    { label: "mo", seconds: 60 * 60 * 24 * 30 },
    { label: "d", seconds: 60 * 60 * 24 },
    { label: "h", seconds: 60 * 60 },
    { label: "m", seconds: 60 },
  ];
  const unit = units.find((item) => seconds >= item.seconds);
  if (!unit) return "now";
  return `${Math.floor(seconds / unit.seconds)}${unit.label} ago`;
}

export function AnnotationPanel({
  battle,
  selectedLines,
  selectedTextTargets = [],
  open,
  mobileOpen,
  className,
  onMobileOpenChange,
  onClose,
  onJumpToLine,
  isLoggedIn,
  onRequireLogin,
  onAnnotationsChanged,
}: AnnotationPanelProps) {
  const { toast } = useToast();
  const [state, setState] = useState<FetchState>({
    loading: false,
    error: "",
    annotations: [],
  });
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortMode, setSortMode] = useState<AnnotationSort>("top");
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [showFormattingTips, setShowFormattingTips] = useState(false);
  const [isReferenceExpanded, setIsReferenceExpanded] = useState(false);

  const selectedLineIds = useMemo(
    () => selectedLines.map((line) => line.id),
    [selectedLines],
  );
  const firstLine = selectedLines[0] ?? null;
  const lastLine = selectedLines[selectedLines.length - 1] ?? null;
  const normalizedTextTargets = useMemo(() => {
    return selectedTextTargets.map((target) => {
      const line = selectedLines.find((item) => item.id === target.lineId);
      if (!line) return target;
      const start = Math.max(0, Math.min(target.start, line.content.length));
      const end = Math.max(start, Math.min(target.end, line.content.length));
      return {
        ...target,
        start,
        end,
        text: line.content.slice(start, end) || target.text,
      };
    });
  }, [selectedLines, selectedTextTargets]);
  const savedTextTargetPreview = useMemo(() => {
    return selectedLines
      .flatMap((line) =>
        (line.annotation_targets ?? []).map((target) => {
          const start = target.start_text_offset;
          const end = target.end_text_offset;
          if (
            start !== null &&
            end !== null &&
            start >= 0 &&
            end > start &&
            start < line.content.length
          ) {
            return line.content.slice(
              start,
              Math.min(end, line.content.length),
            );
          }
          return target.selected_text ?? "";
        }),
      )
      .map((text) => text.trim())
      .filter(Boolean)
      .join(" ");
  }, [selectedLines]);
  const previewText =
    normalizedTextTargets
      .map((target) => target.text.trim())
      .filter(Boolean)
      .join(" ") ||
    savedTextTargetPreview ||
    selectedLines
      .slice(0, 4)
      .map((line) => line.content)
      .join(" ");

  const sortedAnnotations = useMemo(() => {
    return [...state.annotations].sort((left, right) => {
      if (sortMode === "newest") {
        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      }
      const leftTrusted =
        left.quality_state === "verified" ||
        ["trusted", "senior"].includes(left.author.trust_level);
      const rightTrusted =
        right.quality_state === "verified" ||
        ["trusted", "senior"].includes(right.author.trust_level);
      if (leftTrusted !== rightTrusted) return leftTrusted ? -1 : 1;
      if (left.score !== right.score) return right.score - left.score;
      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    });
  }, [sortMode, state.annotations]);

  useEffect(() => {
    if (!open || !firstLine || !lastLine) return;

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: "" }));
    const params = new URLSearchParams({
      startLineId: String(firstLine.id),
      endLineId: String(lastLine.id),
    });
    if (normalizedTextTargets.length > 0) {
      params.set(
        "targets",
        JSON.stringify(
          normalizedTextTargets.map((target) => ({
            lineId: target.lineId,
            start: target.start,
            end: target.end,
          })),
        ),
      );
    }

    fetch(`/api/battles/${battle.id}/annotations?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(body.error || "Failed to load annotations.");
        return body as { annotations: Annotation[] };
      })
      .then((body) =>
        setState({
          loading: false,
          error: "",
          annotations: body.annotations ?? [],
        }),
      )
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load annotations.",
        }));
      });

    return () => controller.abort();
  }, [battle.id, firstLine, lastLine, normalizedTextTargets, open]);

  const resetComposer = () => {
    setDraft("");
    setEditingId(null);
    setComposerExpanded(false);
    setShowFormattingTips(false);
    setIsReferenceExpanded(false);
  };

  useEffect(() => {
    resetComposer();
  }, [firstLine?.id, lastLine?.id]);

  const saveAnnotation = async () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    if (
      !firstLine ||
      !lastLine ||
      draft.trim().length < ANNOTATION_MIN_BODY_LENGTH
    ) {
      return;
    }

    setSaving(true);
    const payload = {
      battle_id: battle.id,
      start_line_id: firstLine.id,
      end_line_id: lastLine.id,
      target_line_id: normalizedTextTargets[0]?.lineId,
      start_text_offset: normalizedTextTargets[0]?.start,
      end_text_offset: normalizedTextTargets[0]?.end,
      selected_text: normalizedTextTargets[0]?.text,
      annotation_targets: normalizedTextTargets.map((target) => ({
        line_id: target.lineId,
        start_text_offset: target.start,
        end_text_offset: target.end,
        selected_text: target.text,
      })),
      body_json: {
        ...toPlainDoc(draft),
        target_text:
          normalizedTextTargets
            .map((target) => target.text.trim())
            .filter(Boolean)
            .join("\n") || undefined,
      },
      body_text: draft.trim(),
    };
    const url = editingId
      ? `/api/annotations/${editingId}`
      : "/api/annotations";
    const method = editingId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to save annotation.");

      const saved = body.annotation as Annotation;
      setState((current) => ({
        ...current,
        annotations: editingId
          ? current.annotations.map((annotation) =>
              annotation.id === saved.id ? saved : annotation,
            )
          : [saved, ...current.annotations],
      }));
      if (!editingId) {
        onAnnotationsChanged?.(selectedLineIds, 1, normalizedTextTargets);
      }
      toast({
        description: editingId
          ? "Annotation updated."
          : "Annotation published.",
      });
      resetComposer();
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : "Failed to save annotation.",
      }));
    } finally {
      setSaving(false);
    }
  };

  const vote = async (annotation: Annotation) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const method = annotation.current_user_voted ? "DELETE" : "POST";
    const pointDelta = method === "POST" ? 1 : -1;
    const res = await fetch(`/api/annotations/${annotation.id}/vote`, {
      method,
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState((current) => ({
        ...current,
        error: body.error || "Failed to update vote.",
      }));
      return;
    }
    setState((current) => ({
      ...current,
      annotations: current.annotations.map((item) =>
        item.id === annotation.id
          ? {
              ...item,
              score: body.score ?? item.score,
              current_user_voted: method === "POST",
              author: {
                ...item.author,
                points: Math.max(0, item.author.points + pointDelta),
              },
            }
          : item,
      ),
    }));
  };

  const deleteAnnotation = async (annotationId: string) => {
    const res = await fetch(`/api/annotations/${annotationId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return;
    setState((current) => ({
      ...current,
      annotations: current.annotations.filter(
        (annotation) => annotation.id !== annotationId,
      ),
    }));
    onAnnotationsChanged?.(selectedLineIds, -1);
  };

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border/60 shrink-0 border-b px-4 py-4 pt-4 lg:pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
              Annotation
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="hidden lg:inline-flex"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p
          className={cn(
            "text-foreground mt-3 text-xs leading-relaxed font-bold",
            !isReferenceExpanded && "line-clamp-3",
          )}
        >
          “{previewText}”
        </p>
        {previewText.length > 120 && (
          <button
            type="button"
            onClick={() => setIsReferenceExpanded(!isReferenceExpanded)}
            className="text-muted-foreground mt-1 block text-[11px] font-semibold hover:underline"
          >
            {isReferenceExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      <div className="[&::-webkit-scrollbar-thumb]:bg-muted min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-color:var(--muted)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="space-y-3">
          <Textarea
            size={composerExpanded ? "default" : "compact"}
            value={draft}
            onFocus={() => setComposerExpanded(true)}
            onClick={() => setComposerExpanded(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              setComposerExpanded(true);
            }}
            placeholder="Write annotation"
            className={cn(
              "resize-none px-3 text-sm leading-5 placeholder:text-sm placeholder:leading-5",
              composerExpanded ? "min-h-24 py-2" : "min-h-11 py-[11px]",
            )}
          />
          {composerExpanded && (
            <>
              <div className="border-border/50 bg-card/40 rounded-md border">
                <button
                  type="button"
                  onClick={() => setShowFormattingTips((current) => !current)}
                  className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Formatting tips
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      showFormattingTips && "rotate-180",
                    )}
                  />
                </button>
                {showFormattingTips && (
                  <ul className="border-border/50 text-muted-foreground list-disc space-y-1 border-t px-3 py-2 pl-6 text-xs leading-relaxed">
                    <li>Use blank lines for separate thoughts.</li>
                    <li>Add quotes around lyrics.</li>
                    <li>Keep links on their own line.</li>
                    <li>
                      Use{" "}
                      <code className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">
                        [[line:123]]
                      </code>{" "}
                      to create a jump link to another transcript line.
                    </li>
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="xs" onClick={resetComposer}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void saveAnnotation()}
                  disabled={
                    saving || draft.trim().length < ANNOTATION_MIN_BODY_LENGTH
                  }
                  size="xs"
                >
                  <Check className="h-3 w-3" />
                  {editingId ? "Save" : "Publish"}
                </Button>
              </div>
            </>
          )}
          {state.error && (
            <p className="text-destructive text-xs">{state.error}</p>
          )}
        </div>

        <Separator className="bg-border/50 my-5" />

        <div className="flex items-center justify-end gap-3">
          <div className="border-border/50 bg-card/40 inline-flex rounded-md border p-0.5">
            {(["top", "newest"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={sortMode === mode ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setSortMode(mode)}
                className="h-6 px-2 text-[10px] capitalize"
              >
                {mode === "top" ? "Top" : "Newest"}
              </Button>
            ))}
          </div>
        </div>

        <AnnotationList
          annotations={sortedAnnotations}
          loading={state.loading}
          onVote={vote}
          onEdit={(annotation) => {
            setEditingId(annotation.id);
            setDraft(annotation.body_text);
            setComposerExpanded(true);
          }}
          onDelete={deleteAnnotation}
          onJumpToLine={onJumpToLine}
        />
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "bg-background border-border/70 hidden min-h-0 overflow-hidden rounded-lg border shadow-xl lg:block",
          open ? "opacity-100" : "pointer-events-none hidden opacity-0",
          "transition-opacity duration-200",
          className,
        )}
      >
        {content}
      </aside>
      <div
        className={cn(
          "bg-background border-border/70 fixed right-0 bottom-0 left-0 z-50 h-[88dvh] max-h-[88dvh] overflow-hidden rounded-t-lg border-t shadow-2xl lg:hidden",
          "transform transition-[transform,opacity] duration-300 ease-in-out",
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-full opacity-0",
        )}
      >
        <div className="bg-muted-foreground/30 absolute top-4 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full" />
        {content}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMobileOpenChange(false)}
          className="absolute top-4 right-3"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function AnnotationList({
  annotations,
  loading,
  onVote,
  onEdit,
  onDelete,
  onJumpToLine,
}: {
  annotations: Annotation[];
  loading: boolean;
  onVote: (annotation: Annotation) => void;
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotationId: string) => void;
  onJumpToLine: (lineId: number) => void;
}) {
  if (loading) {
    return (
      <div className="divide-border/50 mt-3 divide-y">
        {[0, 1, 2].map((item) => (
          <div key={item} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="bg-muted h-3 w-28 animate-pulse rounded" />
                <div className="bg-muted/70 h-2.5 w-16 animate-pulse rounded" />
              </div>
              <div className="bg-muted h-7 w-12 animate-pulse rounded-md" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="bg-muted/80 h-3 w-full animate-pulse rounded" />
              <div className="bg-muted/70 h-3 w-4/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (annotations.length === 0) {
    return (
      <div className="border-border/60 bg-muted/20 mt-3 rounded-lg border p-4 text-sm">
        <MessageSquareText className="text-muted-foreground mb-3 h-5 w-5" />
        No annotations yet. Start with context, wordplay, or a reference that
        helps the line land.
      </div>
    );
  }

  return (
    <div className="divide-border/50 mt-3 divide-y">
      {annotations.map((annotation) => (
        <article key={annotation.id} className="py-4 first:pt-2 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar size="sm">
                {annotation.author.image_url && (
                  <AvatarImage
                    src={annotation.author.image_url}
                    alt={usernameLabel(annotation)}
                  />
                )}
                <AvatarFallback>
                  {getInitials(
                    annotation.author.username ||
                      annotation.author.display_name ||
                      "A3",
                  ) || "A3"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="text-foreground/90 truncate text-xs font-normal">
                    {usernameLabel(annotation)}
                  </p>
                  {annotation.quality_state !== "normal" && (
                    <Badge variant="secondary" className="text-[9px]">
                      {annotation.quality_state}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <Zap className="text-primary h-3 w-3" />
                  <span>{annotation.author.points} rep</span>
                  <span aria-hidden="true">•</span>
                  <span>{formatAnnotationAge(annotation.created_at)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <AnnotationBody
              text={annotation.body_text}
              onJumpToLine={onJumpToLine}
            />
          </div>

          <div className="mt-3 flex items-center gap-1">
            <Button
              variant={annotation.current_user_voted ? "secondary" : "ghost"}
              size="xs"
              onClick={() => onVote(annotation)}
              title="Upvote annotation"
              className="h-6 px-2"
            >
              <Triangle
                className={cn(
                  "h-3 w-3",
                  annotation.current_user_voted && "fill-current",
                )}
              />
              {annotation.score}
            </Button>
            {annotation.can_edit && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Annotation actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-28">
                  <DropdownMenuItem onSelect={() => onEdit(annotation)}>
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onDelete(annotation.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
