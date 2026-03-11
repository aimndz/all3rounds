import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  itemCount?: number;
  itemLabel?: string;
  children?: ReactNode; // For actions
}

export function PageHeader({
  title,
  icon: Icon,
  iconClassName = "text-primary",
  itemCount,
  itemLabel = "ITEMS",
  children,
}: PageHeaderProps) {
  return (
    <div className="border-border/40 mb-8 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-end">
      <div className="flex flex-col gap-3 space-y-1 md:flex-row md:items-center">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-white uppercase">
          {Icon && <Icon className={`h-8 w-8 ${iconClassName}`} />}
          {title}
        </h1>
        {itemCount !== undefined && (
          <div className="flex w-fit h-9 items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-bold tracking-tighter text-white/60">
            {itemCount} {itemLabel}
          </div>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {children}
        </div>
      )}
    </div>
  );
}
