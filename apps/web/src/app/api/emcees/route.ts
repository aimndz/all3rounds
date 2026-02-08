import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  const supabase = await createClient();

  let dbQuery = supabase.from("emcees").select("id, name").order("name");

  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch emcees." },
      { status: 500 },
    );
  }

  return NextResponse.json(data || []);
}
