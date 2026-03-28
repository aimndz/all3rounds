import { ReactNode } from "react";
import AdminNav from "@/components/AdminNav";
import { ErrorAlert } from "./ErrorAlert";

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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      {!hideNav && <AdminNav />}

      <div className="relative z-10 space-y-8">
        <ErrorAlert message={error || null} />
        {children}
      </div>
    </main>
  );
}
