import { ReactNode } from "react";
import { requirePermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReviewsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await requirePermission("suggestions:review");

  if (auth.error) {
    redirect("/"); // Or redirect to a 403 page
  }

  return <>{children}</>;
}
