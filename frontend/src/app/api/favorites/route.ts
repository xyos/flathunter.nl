import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Favorite } from "@/lib/types";

export async function GET() {
  const favorites = getDb()
    .prepare("SELECT * FROM favorites ORDER BY updated_at DESC")
    .all() as Favorite[];
  return NextResponse.json(favorites);
}

export async function POST(request: NextRequest) {
  const { expose_id, crawler } = await request.json();
  if (!expose_id || !crawler) {
    return NextResponse.json({ error: "expose_id and crawler required" }, { status: 400 });
  }

  getDb()
    .prepare(
      `INSERT OR IGNORE INTO favorites (expose_id, crawler, status) VALUES (?, ?, 'new')`
    )
    .run(expose_id, crawler);

  return NextResponse.json({ success: true });
}
