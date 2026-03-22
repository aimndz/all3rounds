import { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  itemCount?: number;
  children?: ReactNode; // For actions
}

export function PageHeader({
  title,
  itemCount,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white uppercase sm:text-3xl">
          {title}
          {itemCount !== undefined && (
            <div className="flex h-7 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-[10px] font-bold tracking-widest text-white/40 uppercase sm:h-8 sm:ml-2 sm:text-xs">
              <span className="mt-px">{itemCount}</span>
            </div>
          )}
        </h1>
      </div>

      {children && (
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          {children}
        </div>
      )}
    </div>
  );
}
