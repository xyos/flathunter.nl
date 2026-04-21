import { NextRequest, NextResponse } from "next/server";
import { getAllFavorites, insertFavorite } from "@/lib/db";

export async function GET() {
  const favorites = await getAllFavorites();
  return NextResponse.json(favorites);
}

export async function POST(request: NextRequest) {
  const { expose_id, crawler } = await request.json();
  if (!expose_id || !crawler) {
    return NextResponse.json({ error: "expose_id and crawler required" }, { status: 400 });
  }
  await insertFavorite(Number(expose_id), crawler);
  return NextResponse.json({ success: true });
}
