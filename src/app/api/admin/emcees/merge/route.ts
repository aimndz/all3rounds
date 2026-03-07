import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const MergeEmceesSchema = z
  .object({
    sourceId: z.string().uuid("Invalid source ID"),
    targetId: z.string().uuid("Invalid target ID"),
  })
  .refine((data) => data.sourceId !== data.targetId, {
    message: "Cannot merge an emcee into itself.",
  });

export async function POST(request: NextRequest) {
  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  // ── Auth & Permission Check ──
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

  const parsed = MergeEmceesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { sourceId, targetId } = parsed.data;

  const adminClient = createAdminClient();

  try {
    // 1. Fetch both emcees
    const { data: emcees, error: fetchError } = await adminClient
      .from("emcees")
      .select("*")
      .in("id", [sourceId, targetId]);

    if (fetchError || !emcees || emcees.length !== 2) {
      console.error("Merge emcees fetch error:", fetchError);
      return NextResponse.json(
        { error: "Could not find both emcees." },
        { status: 404 },
      );
    }

    const source = emcees.find((e) => e.id === sourceId);
    const target = emcees.find((e) => e.id === targetId);

    if (!source || !target) {
      throw new Error("Logic error separating source/target");
    }

    // 2. Reassign Lines belonging to the source emcee to the target emcee
    const { error: linesError } = await adminClient
      .from("lines")
      .update({ emcee_id: targetId })
      .eq("emcee_id", sourceId);

    if (linesError) {
      console.error("Reassign lines error:", linesError);
      throw linesError;
    }

    // We should also update edit_history if we change the lines, but since
    // edit history acts mostly as an audit log, changing emcee_id in lines
    // doesn't invalidate the old history pointing to the line_id. Actually,
    // if someone edited the line to set emcee_id=sourceId, the old_value/new_value
    // text will remain as the old UUID in the edit_history table. That is fine for a log.

    // 3. Reassign Battle Participants
    // We need to carefully handle the UNIQUE(battle_id, emcee_id) constraint.
    const { data: sourceParts, error: spError } = await adminClient
      .from("battle_participants")
      .select("id, battle_id")
      .eq("emcee_id", sourceId);

    const { data: targetParts, error: tpError } = await adminClient
      .from("battle_participants")
      .select("id, battle_id")
      .eq("emcee_id", targetId);

    if (spError || tpError) throw spError || tpError;

    const targetBattleIds = new Set(
      (targetParts || []).map((p) => p.battle_id),
    );

    // For each source participation
    for (const sp of sourceParts || []) {
      if (targetBattleIds.has(sp.battle_id)) {
        // Target is already in this battle! Delete the source's duplicate participation entry
        // to prevent violating the UNIQUE(battle_id, emcee_id) constraint.
        await adminClient.from("battle_participants").delete().eq("id", sp.id);
      } else {
        // Target is not in this battle, reassigned to target
        await adminClient
          .from("battle_participants")
          .update({ emcee_id: targetId })
          .eq("id", sp.id);
      }
    }

    // 4. Update Target Emcee's AKA
    // Combine existing target AKAs with source's name and source's AKAs
    const existingAka = new Set<string>(target.aka || []);
    existingAka.add(source.name); // The old primary name becomes an AKA
    (source.aka || []).forEach((a: string) => existingAka.add(a));

    // Remove the target's current name if it ended up in the list somehow
    existingAka.delete(target.name);

    const { error: targetUpdateError } = await adminClient
      .from("emcees")
      .update({ aka: Array.from(existingAka) })
      .eq("id", targetId);

    if (targetUpdateError) throw targetUpdateError;

    // 5. Delete Source Emcee
    const { error: deleteError } = await adminClient
      .from("emcees")
      .delete()
      .eq("id", sourceId);

    if (deleteError) throw deleteError;

    // 6. Invalidate caches
    await invalidateCachePattern("emcees:*");
    await invalidateCachePattern("battles:*");
    await invalidateCachePattern("battle:*");

    return NextResponse.json({
      success: true,
      newAka: Array.from(existingAka),
    });
  } catch (error: unknown) {
    console.error("Merge error:", error);
    return NextResponse.json(
      {
        error: "Merge operation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
