import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const OverrideSchema = z.object({
  newAction: z.enum(["approve", "reject"], { message: "Invalid action" })
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  // ── Auth & Permission Check ──
  const auth = await requirePermission("users:manage");
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

  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { newAction } = parsed.data;

  const adminClient = createAdminClient();

  // 1. Fetch the suggestion
  const { data: suggestion, error: suggestionError } = await adminClient
    .from("suggestions")
    .select("*")
    .eq("id", id)
    .single();

  if (suggestionError || !suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found." },
      { status: 404 },
    );
  }

  if (suggestion.status === "pending") {
    return NextResponse.json(
      { error: "Suggestion is still pending." },
      { status: 400 },
    );
  }

  const targetStatus = newAction === "approve" ? "approved" : "rejected";
  if (suggestion.status === targetStatus) {
    return NextResponse.json(
      { error: `Suggestion is already ${targetStatus}.` },
      { status: 400 },
    );
  }

  try {
    if (newAction === "approve") {
      // It was rejected, now we are approving it.
      // 1. Update line content to suggested_content
      const { error: lineUpdateError } = await adminClient
        .from("lines")
        .update({ content: suggestion.suggested_content })
        .eq("id", suggestion.line_id);

      if (lineUpdateError) throw lineUpdateError;

      // 2. Add to edit history
      await adminClient.from("edit_history").insert({
        line_id: suggestion.line_id,
        user_id: auth.user.id, // overridden by superadmin
        field_changed: "content (superadmin override: approved)",
        old_value: suggestion.original_content,
        new_value: suggestion.suggested_content,
      });
    } else if (newAction === "reject") {
      // It was approved. We are reverting it back to original content.
      // 1. Update line content to original_content
      const { error: lineUpdateError } = await adminClient
        .from("lines")
        .update({ content: suggestion.original_content })
        .eq("id", suggestion.line_id);

      if (lineUpdateError) throw lineUpdateError;

      // 2. Add to edit history
      await adminClient.from("edit_history").insert({
        line_id: suggestion.line_id,
        user_id: auth.user.id,
        field_changed: "content (superadmin override: reverted)",
        old_value: suggestion.suggested_content,
        new_value: suggestion.original_content,
      });
    }

    // 3. Update suggestion status and note
    const { error: updateError } = await adminClient
      .from("suggestions")
      .update({
        status: targetStatus,
        review_note:
          (suggestion.review_note ? suggestion.review_note + "\n" : "") +
          `[Overridden to ${targetStatus} by superadmin ${auth.user.displayName}]`,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, newStatus: targetStatus });
  } catch (error) {
    console.error("Override error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during override." },
      { status: 500 },
    );
  }
}
