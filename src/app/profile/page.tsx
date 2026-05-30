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
    <PageShell width="narrow" spacing="roomy" className="pb-16 sm:pb-20">
      <PageStack className="gap-8">
        <section className="max-w-3xl space-y-4">
          <h1 className="page-heading">Profile</h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
            Choose the username that appears on public contributor surfaces.
          </p>
        </section>

        <ProfileForm user={user} />
      </PageStack>
    </PageShell>
  );
}
