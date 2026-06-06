import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/db/d1-client";
import { getUserWithRole } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { ReportAnnotationSchema } from "@/lib/annotations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const { user } = await getUserWithRole();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReportAnnotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();
  const { data: annotation } = await adminClient
    .from("annotations")
    .select("id, author_id")
    .eq("id", id)
    .maybeSingle();

  if (!annotation) {
    return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  }

  const { data: existing } = await adminClient
    .from("annotation_reports")
    .select("id")
    .eq("annotation_id", id)
    .eq("reporter_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true });
  }

  const { error } = await adminClient.from("annotation_reports").insert({
    id: crypto.randomUUID(),
    annotation_id: id,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
    status: "open",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Create annotation report error:", error);
    return NextResponse.json(
      { error: "Failed to report annotation." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
