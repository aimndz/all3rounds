import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Layout, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BattleStatus } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const STATUS_CONFIG: Record<
  BattleStatus,
  { label: string; icon: LucideIcon; class: string; description: string }
> = {
  reviewed: {
    label: "Reviewed",
    icon: CheckCircle2,
    class:
      "bg-emerald-600 text-emerald-50 dark:bg-emerald-500 dark:text-emerald-50 border-emerald-400/20 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.5)]",
    description: "Human-checked. Ready to read.",
  },
  reviewing: {
    label: "Reviewing",
    icon: Clock,
    class:
      "bg-amber-600 text-amber-50 dark:bg-amber-500 dark:text-amber-50 border-amber-400/20 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.5)]",
    description: "We are fixing the lyrics right now.",
  },
  arranged: {
    label: "Arranged",
    icon: Layout,
    class:
      "bg-sky-600 text-sky-50 dark:bg-sky-500 dark:text-sky-50 border-sky-400/20 shadow-[0_2px_10px_-3px_rgba(14,165,233,0.5)]",
    description: "Emcees and rounds are set.",
  },
  raw: {
    label: "Raw",
    icon: FileText,
    class:
      "bg-slate-600 text-slate-50 dark:bg-slate-500 dark:text-slate-50 border-slate-400/20 shadow-[0_2px_10px_-3px_rgba(71,85,105,0.5)]",
    description: "AI transcript—may have errors.",
  },
};

export function StatusBadge({
  status,
  className,
  noTooltip = false,
}: {
  status: BattleStatus;
  className?: string;
  noTooltip?: boolean;
}) {
  const config = STATUS_CONFIG[status || "raw"];
  const Icon = config.icon;

  const content = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border px-1.5 py-0.5 font-semibold shadow-sm backdrop-blur-md transition-all",
        config.class,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );

  if (noTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-50 cursor-default text-xs">
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
