import { ReactNode } from "react";
import { requirePermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await requirePermission("users:manage");

  if (auth.error) {
    redirect("/"); // Or redirect to a 403 page
  }

  return <>{children}</>;
}
