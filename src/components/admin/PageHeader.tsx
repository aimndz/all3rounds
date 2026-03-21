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
    <div className="border-border/40 mb-6 flex flex-col justify-between gap-4 border-b pb-4 md:flex-row md:items-end">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-white uppercase sm:text-3xl flex items-center gap-2">
          {Icon && <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconClassName}`} />}
          {title}
        </h1>
        
        <div className="flex items-center justify-between gap-2 w-full md:w-auto md:justify-start">
          {itemCount !== undefined && (
            <div className="flex w-fit h-7 items-center rounded-lg border border-white/5 bg-white/5 px-2.5 text-[10px] font-bold tracking-widest text-white/40 uppercase sm:h-8 sm:text-xs sm:px-3">
              {itemCount} {itemLabel}
            </div>
          )}

          {/* Mobile Actions - shown alongside count items on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            {children}
          </div>
        </div>
      </div>

      {/* Desktop Actions */}
      {children && (
        <div className="hidden md:flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
