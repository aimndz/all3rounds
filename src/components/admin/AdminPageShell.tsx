import { ReactNode } from "react";
import AdminNav from "@/components/AdminNav";
import { ErrorAlert } from "./ErrorAlert";
import { PageShell, PageStack } from "@/components/ui/page-shell";

interface AdminPageShellProps {
  children: ReactNode;
  error?: string | null;
  hideNav?: boolean;
}

export function AdminPageShell({
  children,
  error,
  hideNav = false,
}: AdminPageShellProps) {
  return (
    <PageShell>
      <div className="relative z-10 flex items-start gap-8">
        {!hideNav && <AdminNav />}

        <PageStack className="min-w-0 flex-1">
          <ErrorAlert message={error || null} />
          {children}
        </PageStack>
      </div>
    </PageShell>
  );
}
