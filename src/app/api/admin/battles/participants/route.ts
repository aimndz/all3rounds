import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const ManageParticipantsSchema = z.object({
  operations: z.array(
    z.discriminatedUnion("action", [
      z.object({
        action: z.literal("add"),
        battleId: z.string().uuid(),
        emceeId: z.string().uuid(),
      }),
      z.object({
        action: z.literal("remove"),
        participantId: z.string().uuid(),
      }),
      z.object({
        action: z.literal("update"),
        participantId: z.string().uuid(),
        newEmceeId: z.string().uuid(),
      }),
    ])
  ),
});

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const auth = await requirePermission("emcees:manage"); // Can use the same permission for now
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

  const parsed = ManageParticipantsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { operations } = parsed.data;
  const adminClient = createAdminClient();

  try {
    for (const op of operations) {
      if (op.action === "add") {
        const { error } = await adminClient
          .from("battle_participants")
          .upsert(
            { battle_id: op.battleId, emcee_id: op.emceeId },
            { onConflict: "battle_id,emcee_id" }
          );
        if (error) throw error;
      } else if (op.action === "remove") {
        const { error } = await adminClient
          .from("battle_participants")
          .delete()
          .eq("id", op.participantId);
        if (error) throw error;
      } else if (op.action === "update") {
        const { error } = await adminClient
          .from("battle_participants")
          .update({ emcee_id: op.newEmceeId })
          .eq("id", op.participantId);
        if (error) throw error;
      }
    }

    // Invalidate caches
    await invalidateCachePattern("emcees:*");
    await invalidateCachePattern("battles:*");
    await invalidateCachePattern("battle:*");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Manage participants error:", error);
    return NextResponse.json(
      {
        error: "Operation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
