import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/db/d1-client";
import { getUserWithRole, hasPermission, type UserRole } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import {
  buildAnnotationResponse,
  fetchReferences,
  UpdateAnnotationSchema,
  type AnnotationRow,
} from "@/lib/annotations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

async function fetchAnnotation(id: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("annotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AnnotationRow;
}

function canModifyAnnotation(options: {
  userId: string;
  role: UserRole;
  annotation: AnnotationRow;
}) {
  return (
    options.annotation.author_id === options.userId ||
    hasPermission(options.role, "annotations:moderate")
  );
}

export async function PATCH(
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
  const { user, role } = await getUserWithRole();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  const annotation = await fetchAnnotation(id);
  if (!annotation) {
    return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  }

  if (!canModifyAnnotation({ userId: user.id, role, annotation })) {
    return NextResponse.json(
      { error: "You cannot edit this annotation." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateAnnotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const isModerator = hasPermission(role, "annotations:moderate");
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.body_json !== undefined) {
    updates.body_json = JSON.stringify(payload.body_json);
  }
  if (payload.body_text !== undefined) {
    updates.body_text = payload.body_text;
  }
  if (payload.status !== undefined) {
    if (!isModerator && payload.status !== "deleted") {
      return NextResponse.json(
        { error: "Only moderators can change annotation status." },
        { status: 403 },
      );
    }
    updates.status = payload.status;
    updates.deleted_at =
      payload.status === "deleted" ? new Date().toISOString() : null;
  }
  if (payload.quality_state !== undefined) {
    if (!isModerator) {
      return NextResponse.json(
        { error: "Only moderators can change annotation quality." },
        { status: 403 },
      );
    }
    updates.quality_state = payload.quality_state;
  }

  const adminClient = createAdminClient();
  const { data: updated, error } = await adminClient
    .from("annotations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    console.error("Update annotation error:", error);
    return NextResponse.json(
      { error: "Failed to update annotation." },
      { status: 500 },
    );
  }

  if (payload.references !== undefined) {
    const references = await fetchReferences(
      annotation.battle_id,
      payload.references,
    );
    if (references.error) {
      return NextResponse.json({ error: references.error }, { status: 400 });
    }

    await adminClient
      .from("annotation_line_references")
      .delete()
      .eq("annotation_id", id);

    if (references.references.length > 0) {
      const now = new Date().toISOString();
      await adminClient.from("annotation_line_references").insert(
        references.references.map((reference) => ({
          id: crypto.randomUUID(),
          annotation_id: id,
          battle_id: annotation.battle_id,
          line_id: reference.line_id,
          line_sort: reference.line_sort,
          label: reference.label,
          created_at: now,
        })),
      );
    }
  }

  const responseAnnotations = await buildAnnotationResponse({
    annotations: [updated as AnnotationRow],
    currentUserId: user.id,
  });

  return NextResponse.json({ annotation: responseAnnotations[0] ?? updated });
}

export async function DELETE(
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
  const { user, role } = await getUserWithRole();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  const annotation = await fetchAnnotation(id);
  if (!annotation) {
    return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  }

  if (!canModifyAnnotation({ userId: user.id, role, annotation })) {
    return NextResponse.json(
      { error: "You cannot delete this annotation." },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("annotations")
    .update({
      status: "deleted",
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    console.error("Delete annotation error:", error);
    return NextResponse.json(
      { error: "Failed to delete annotation." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
