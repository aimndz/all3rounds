import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // ── Auth & Permission Check ──
  const auth = await requirePermission("suggestions:create");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }
  const { user } = auth;

  const adminClient = createAdminClient();
  const body = await request.json();
  const { line_id, suggested_content } = body;

  if (!line_id || !suggested_content) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  // 1. Fetch current line content snapshot
  const { data: line, error: lineError } = await adminClient
    .from("lines")
    .select("content")
    .eq("id", line_id)
    .single();

  if (lineError || !line) {
    return NextResponse.json({ error: "Line not found." }, { status: 404 });
  }

  // 2. Insert suggestion
  const { error: insertError } = await adminClient.from("suggestions").insert({
    line_id,
    user_id: user.id,
    suggested_content,
    original_content: line.content,
    status: "pending",
  });

  if (insertError) {
    console.error("Insert suggestion error:", insertError);
    return NextResponse.json(
      { error: "Failed to submit suggestion." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  // ── Auth & Permission Check (reviewers only) ──
  const auth = await requirePermission("suggestions:review");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const statusString = searchParams.get("status") || "pending";
  const requestedStatuses = statusString.split(",");

  const adminClient = createAdminClient();

  // 1. Fetch the reviewer's trust level
  const { data: reviewerProfile } = await adminClient
    .from("user_profiles")
    .select("trust_level, role")
    .eq("id", auth.user.id) // using auth.user instead of user
    .single();

  const isTrusted =
    reviewerProfile?.trust_level === "trusted" ||
    reviewerProfile?.trust_level === "senior" ||
    ["superadmin", "admin"].includes(reviewerProfile?.role || "");

  // If not trusted, strictly restrict to requestedStatuses minus flagged
  // Alternatively, just force 'pending' if they aren't trusted.
  const filterStatuses = isTrusted
    ? requestedStatuses
    : requestedStatuses.filter((s) => s !== "flagged");

  // If they asked for flagged but aren't trusted, they get an empty array.
  if (filterStatuses.length === 0) {
    return NextResponse.json([]);
  }

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Fetch suggestions with line context and suggester info
  // Note: user_profiles is joined via user_id
  const { data, error, count } = await adminClient
    .from("suggestions")
    .select(
      `
      *,
      lines (
        content,
        start_time,
        end_time,
        battle:battles ( id, title, youtube_id )
      ),
      user:user_profiles!suggestions_user_id_fkey ( display_name )
    `,
      { count: "exact" },
    )
    .in("status", filterStatuses)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Fetch suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    limit,
  });
}
