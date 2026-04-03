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
      "border-emerald-400/25 bg-emerald-500/14 text-emerald-100",
    description: "Human-checked. Ready to read.",
  },
  reviewing: {
    label: "Reviewing",
    icon: Clock,
    class:
      "border-amber-400/25 bg-amber-500/16 text-amber-100",
    description: "We are fixing the lyrics right now.",
  },
  arranged: {
    label: "Arranged",
    icon: Layout,
    class:
      "border-sky-400/25 bg-sky-500/14 text-sky-100",
    description: "Emcees and rounds are set.",
  },
  raw: {
    label: "Raw",
    icon: FileText,
    class:
      "border-slate-300/20 bg-slate-200/8 text-slate-100",
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
        "gap-1.5 border px-2 py-1 text-[10px] font-semibold shadow-none backdrop-blur-md transition-all",
        config.class,
        className,
      )}
    >
      <Icon className="h-3 w-3 opacity-90" />
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
