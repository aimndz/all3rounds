import { ReactNode } from "react";
import Header from "@/components/Header";
import AdminNav from "@/components/AdminNav";
import { ErrorAlert } from "./ErrorAlert";

interface AdminPageShellProps {
  children: ReactNode;
  error?: string | null;
  hideNav?: boolean;
}

export function AdminPageShell({ children, error, hideNav = false }: AdminPageShellProps) {
  return (
    <div className="selection:bg-primary/20 min-h-screen bg-[#09090b] text-[#fafafa]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {!hideNav && <AdminNav />}
        <ErrorAlert message={error || null} />
        {children}
      </main>
    </div>
  );
}
