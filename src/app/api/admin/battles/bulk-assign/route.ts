import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const BulkAssignSchema = z.object({
  battleIds: z.array(z.string().uuid()).min(1),
  emceeIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const auth = await requirePermission("emcees:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BulkAssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { battleIds, emceeIds } = parsed.data;
  const adminClient = createAdminClient();

  try {
    const payload = [];
    for (const b of battleIds) {
      for (const e of emceeIds) {
        payload.push({ battle_id: b, emcee_id: e });
      }
    }

    const { error } = await adminClient
      .from("battle_participants")
      .upsert(payload, { onConflict: "battle_id,emcee_id" });

    if (error) throw error;

    await invalidateCachePattern("emcees:*");
    await invalidateCachePattern("battles:*");
    await invalidateCachePattern("battle:*");

    return NextResponse.json({ success: true, count: payload.length });
  } catch (error: unknown) {
    console.error("Bulk assign error:", error);
    return NextResponse.json(
      {
        error: "Bulk assign operation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
