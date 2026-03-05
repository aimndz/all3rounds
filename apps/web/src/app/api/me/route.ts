import { NextResponse } from "next/server";
import { getUserWithRole } from "@/lib/auth";

export async function GET() {
  const { user, role } = await getUserWithRole();

  if (!user) {
    return NextResponse.json({ user: null, role: "viewer" });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    role,
  });
}
