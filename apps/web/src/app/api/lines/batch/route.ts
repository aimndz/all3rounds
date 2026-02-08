import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function PATCH(request: NextRequest) {
  // Use regular client for auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use admin client for data operations (bypasses RLS)
  const adminClient = createAdminClient();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to edit lines." },
      { status: 401 },
    );
  }

  const { allowed } = checkRateLimit(`edit:${user.id}`, RATE_LIMITS.edit);
  if (!allowed) {
    return NextResponse.json(
      { error: "Edit limit reached. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { lineIds, action, value } = body as {
    lineIds: number[];
    action: "set_round" | "set_emcee" | "delete";
    value?: string | number;
  };

  if (!Array.isArray(lineIds) || lineIds.length === 0) {
    return NextResponse.json({ error: "No lines selected." }, { status: 400 });
  }

  if (lineIds.length > 200) {
    return NextResponse.json(
      { error: "Too many lines selected (max 200)." },
      { status: 400 },
    );
  }

  if (!["set_round", "set_emcee", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  try {
    if (action === "set_round") {
      const roundVal =
        value === null || value === "" || value === "none"
          ? null
          : Number(value);

      // Record edit history for each line
      const { data: existing } = await adminClient
        .from("lines")
        .select("id, round_number")
        .in("id", lineIds);

      if (existing) {
        const historyRows = existing.map((line) => ({
          line_id: line.id,
          user_id: user.id,
          field_changed: "round_number",
          old_value: String(line.round_number ?? ""),
          new_value: String(roundVal ?? ""),
        }));
        await adminClient.from("edit_history").insert(historyRows);
      }

      const { error: updateError } = await adminClient
        .from("lines")
        .update({ round_number: roundVal })
        .in("id", lineIds);

      if (updateError) throw updateError;
    } else if (action === "set_emcee") {
      const emceeVal =
        value === "none" || value === "" || value === null ? null : value;

      const { data: existing } = await adminClient
        .from("lines")
        .select("id, emcee_id")
        .in("id", lineIds);

      if (existing) {
        const historyRows = existing.map((line) => ({
          line_id: line.id,
          user_id: user.id,
          field_changed: "emcee_id",
          old_value: String(line.emcee_id ?? ""),
          new_value: String(emceeVal ?? ""),
        }));
        await adminClient.from("edit_history").insert(historyRows);
      }

      const { error: updateError } = await adminClient
        .from("lines")
        .update({ emcee_id: emceeVal })
        .in("id", lineIds);

      if (updateError) throw updateError;
    } else if (action === "delete") {
      // Record deletion in edit history
      const { data: existing } = await adminClient
        .from("lines")
        .select("id, content")
        .in("id", lineIds);

      if (existing) {
        const historyRows = existing.map((line) => ({
          line_id: line.id,
          user_id: user.id,
          field_changed: "deleted",
          old_value: line.content,
          new_value: "",
        }));
        await adminClient.from("edit_history").insert(historyRows);
      }

      const { error: deleteError } = await adminClient
        .from("lines")
        .delete()
        .in("id", lineIds);

      if (deleteError) throw deleteError;
    }

    return NextResponse.json({ success: true, count: lineIds.length });
  } catch (err) {
    console.error("Batch operation error:", err);
    return NextResponse.json(
      { error: "Batch operation failed." },
      { status: 500 },
    );
  }
}
