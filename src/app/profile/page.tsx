import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/lib/auth";
import { PageShell, PageStack } from "@/components/ui/page-shell";
import { ProfileForm } from "@/app/profile/ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
  description: "Update your All3Rounds contributor profile.",
};

export default async function ProfilePage() {
  const { user } = await getUserWithRole();

  if (!user) {
    redirect("/login");
  }

  return (
    <PageShell
      width="narrow"
      spacing="centered"
      className="min-h-[calc(100vh-12rem)] pb-16"
    >
      <PageStack className="w-full max-w-3xl items-center">
        <ProfileForm user={user} />
      </PageStack>
    </PageShell>
  );
}
