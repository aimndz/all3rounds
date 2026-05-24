import { NextResponse } from "next/server";
import { getUserWithRole } from "@/lib/auth";
import { PRIVATE_CACHE_HEADERS } from "@/lib/api-utils";

export async function GET() {
  const { user, role } = await getUserWithRole();

  if (!user) {
    return NextResponse.json(
      { user: null, role: "viewer" },
      { headers: PRIVATE_CACHE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      role,
    },
    { headers: PRIVATE_CACHE_HEADERS },
  );
}
