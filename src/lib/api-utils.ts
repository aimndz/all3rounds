import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

/**
 * Parse and return JSON body from a request, or an error response.
 * Replaces the repeated try/catch JSON parsing boilerplate in every route.
 */
export async function parseJsonBody<T = unknown>(
  request: NextRequest,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const data = (await request.json()) as T;
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}

/** Standardized JSON error response */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Standardized JSON success response */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Combined CSRF + permission check. Returns the authenticated user or an error response.
 * Eliminates the repeated 3-step boilerplate (CSRF → requirePermission → error check).
 */
export async function requireAuth(request: NextRequest, permission: string) {
  if (!verifyCsrf(request)) {
    return { auth: null, error: apiError("Invalid request origin.", 403) };
  }

  const result = await requirePermission(permission);
  if (result.error) {
    return {
      auth: null,
      error: apiError(result.error.message, result.error.status),
    };
  }

  return { auth: result, error: null };
}

/**
 * Validate a Zod schema against parsed body data.
 * Returns the parsed data or an error response.
 */
export function validateBody<T>(
  schema: {
    safeParse: (
      data: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { message: string }[] } };
  },
  body: unknown,
): { data: T; error: null } | { data: null; error: NextResponse } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      data: null,
      error: apiError(parsed.error.issues[0].message, 400),
    };
  }
  return { data: parsed.data, error: null };
}
