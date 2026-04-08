import { NextRequest, NextResponse } from "next/server";
import { parseSearchQuery } from "@/lib/search-query";
import { searchMeilisearchSuggestions } from "@/lib/meilisearch/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q")?.trim() || "";
  const rawLimit = Number.parseInt(searchParams.get("limit") || "5", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 5))
    : 5;

  if (!rawQuery || rawQuery.length > 200) {
    return NextResponse.json(
      { suggestions: [] },
      { headers: NO_STORE_HEADERS },
    );
  }

  const parsedQuery = parseSearchQuery(rawQuery);
  if (parsedQuery.text.length < 1) {
    return NextResponse.json(
      { suggestions: [] },
      { headers: NO_STORE_HEADERS },
    );
  }

  try {
    const suggestions = await searchMeilisearchSuggestions({
      text: parsedQuery.text,
      appliedFilters: parsedQuery.appliedFilters,
      limit,
    });

    return NextResponse.json(
      { suggestions },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("[SEARCH] Suggest failed.", error);
    return NextResponse.json(
      { suggestions: [] },
      { headers: NO_STORE_HEADERS },
    );
  }
}
