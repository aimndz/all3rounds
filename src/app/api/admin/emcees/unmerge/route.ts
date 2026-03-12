import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/cache";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const UnmergeEmceeSchema = z.object({
  sourceId: z.string().uuid("Invalid source ID"),
  akaName: z.string().min(1, "AKA name is required"),
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

  const parsed = UnmergeEmceeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { sourceId, akaName } = parsed.data;
  const adminClient = createAdminClient();

  try {
    // 1. Fetch source emcee
    const { data: emcee, error: fetchError } = await adminClient
      .from("emcees")
      .select("id, name, aka")
      .eq("id", sourceId)
      .single();

    if (fetchError || !emcee) {
      return NextResponse.json(
        { error: "Could not find the source emcee." },
        { status: 404 },
      );
    }

    const currentAka = emcee.aka || [];
    if (!currentAka.includes(akaName)) {
      return NextResponse.json(
        { error: "The specified AKA name does not exist on this emcee." },
        { status: 400 },
      );
    }

    // 2. Remove the AKA from the source emcee's list
    const newAkaList = currentAka.filter((a: string) => a !== akaName);

    const { error: updateError } = await adminClient
      .from("emcees")
      .update({ aka: newAkaList })
      .eq("id", sourceId);

    if (updateError) throw updateError;

    // 3. Create a new emcee with the unmerged name
    const { data: newEmcee, error: createError } = await adminClient
      .from("emcees")
      .insert([
        {
          name: akaName,
          aka: [],
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    // 4. Invalidate caches
    await invalidateCachePattern("emcees:*");

    return NextResponse.json({
      success: true,
      newEmcee,
    });
  } catch (error: unknown) {
    console.error("Unmerge error:", error);
    return NextResponse.json(
      {
        error: "Unmerge operation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
