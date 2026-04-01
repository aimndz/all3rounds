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
    <div className="page-toolbar">
      <div className="flex flex-col gap-1">
        <h1 className="page-heading page-heading--admin flex items-center gap-2">
          {title}
          {itemCount !== undefined && (
            <div className="ui-chip text-muted-foreground sm:ml-2">
              <span className="mt-px">{itemCount}</span>
            </div>
          )}
        </h1>
      </div>

      {children && (
        <div className="page-actions">
          {children}
        </div>
      )}
    </div>
  );
}
