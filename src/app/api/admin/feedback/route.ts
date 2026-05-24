import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { feedback, userProfiles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PRIVATE_CACHE_HEADERS } from "@/lib/api-utils";

const VALID_STATUSES = new Set(["new", "reviewed", "archived"]);
const VALID_CATEGORIES = new Set([
  "bug",
  "content",
  "feature",
  "data",
  "account",
  "other",
]);

export async function GET(request: NextRequest) {
  const auth = await requirePermission("users:manage");
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error.message },
      { status: auth.error.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    50,
  );
  const offset = (page - 1) * limit;

  const filters = [];
  if (status !== "all" && VALID_STATUSES.has(status)) {
    filters.push(eq(feedback.status, status));
  }
  if (category !== "all" && VALID_CATEGORIES.has(category)) {
    filters.push(eq(feedback.category, category));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  try {
    const db = getDb();
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: feedback.id,
          userId: feedback.userId,
          category: feedback.category,
          message: feedback.message,
          contactEmail: feedback.contactEmail,
          pageUrl: feedback.pageUrl,
          userAgent: feedback.userAgent,
          status: feedback.status,
          createdAt: feedback.createdAt,
          reviewedAt: feedback.reviewedAt,
          user: {
            displayName: userProfiles.displayName,
            role: userProfiles.role,
          },
        })
        .from(feedback)
        .leftJoin(userProfiles, eq(feedback.userId, userProfiles.id))
        .where(whereClause)
        .orderBy(desc(feedback.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(feedback).where(whereClause),
    ]);

    return NextResponse.json(
      {
        data: rows,
        total: totalRows[0]?.value ?? 0,
        page,
        limit,
      },
      { headers: PRIVATE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Fetch admin feedback error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback." },
      { status: 500 },
    );
  }
}
