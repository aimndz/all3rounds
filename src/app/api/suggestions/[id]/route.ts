import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { revalidatePath } from "next/cache";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const ReviewSuggestionSchema = z.object({
  action: z.enum(["approve", "reject"], { message: "Action is required" }),
  review_note: z.string().max(2000, "Review note too long").optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── CSRF Check ──
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { id } = await params;

  // ── Auth & Permission Check ──
  const auth = await requirePermission("suggestions:review");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReviewSuggestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { action, review_note } = parsed.data;

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

  if (suggestion.status !== "pending" && suggestion.status !== "flagged") {
    return NextResponse.json({ error: "Already reviewed." }, { status: 400 });
  }

  // 1b. Fetch the reviewer's trust level
  const { data: reviewerProfile } = await adminClient
    .from("user_profiles")
    .select("trust_level, role")
    .eq("id", user.id)
    .single();

  const isTrusted =
    reviewerProfile?.trust_level === "trusted" ||
    reviewerProfile?.trust_level === "senior" ||
    ["superadmin", "admin"].includes(reviewerProfile?.role || "");

  const autoFlag = action === "approve" && !isTrusted;
  const finalStatus = autoFlag
    ? "flagged"
    : action === "approve"
      ? "approved"
      : "rejected";
  const finalNote = autoFlag
    ? (review_note ? review_note + "\n" : "") +
      "[Auto-flagged: Approved by new moderator, pending senior review]"
    : review_note || null;

  try {
    let updatedBattleId = null;

    if (finalStatus === "approved") {
      // 2a. Update the line content
      const { data: updatedLine, error: lineUpdateError } = await adminClient
        .from("lines")
        .update({ content: suggestion.suggested_content })
        .eq("id", suggestion.line_id)
        .select("battle_id")
        .single();

      if (lineUpdateError) throw lineUpdateError;
      updatedBattleId = updatedLine?.battle_id;

      // 2b. Log to edit history
      await adminClient.from("edit_history").insert({
        line_id: suggestion.line_id,
        user_id: suggestion.user_id, // credit to suggester
        field_changed: "content (approved suggestion)",
        old_value: suggestion.original_content,
        new_value: suggestion.suggested_content,
      });
    }

    // 3. Update suggestion status
    const { error: updateError } = await adminClient
      .from("suggestions")
      .update({
        status: finalStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: finalNote,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    if (finalStatus === "approved" && updatedBattleId) {
      await invalidateCache(`battle:${updatedBattleId}`);
    }

    await invalidateCache("admin:stats");

    // Clear Next.js Data Cache for the suggestions list and the reviews page
    revalidatePath("/api/suggestions");
    revalidatePath("/reviews");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Suggestion review error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during review." },
      { status: 500 },
    );
  }
}
