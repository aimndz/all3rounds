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
      {!hideNav && <AdminNav />}

      <PageStack className="relative z-10">
        <ErrorAlert message={error || null} />
        {children}
      </PageStack>
    </PageShell>
  );
}
