import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parsePrice, parseSize, computePricePerSqm } from "@/lib/parse";
import type { Favorite } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const crawler = request.nextUrl.searchParams.get("crawler") || "";

  const row = getDb()
    .prepare("SELECT id, created, crawler, details FROM exposes WHERE id = ? AND crawler = ?")
    .get(Number(id), crawler) as { id: number; created: string; crawler: string; details: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const details = JSON.parse(row.details);
  const price_numeric = parsePrice(details.price || "");
  const size_numeric = parseSize(details.size || "");
  const price_per_sqm = computePricePerSqm(price_numeric, size_numeric);

  const favorite = getDb()
    .prepare("SELECT * FROM favorites WHERE expose_id = ? AND crawler = ?")
    .get(row.id, row.crawler) as Favorite | undefined;

  return NextResponse.json({
    id: row.id,
    url: details.url || "",
    title: details.title || "",
    image: details.image || "",
    price: details.price || "N/A",
    size: details.size || "N/A",
    rooms: details.rooms || "N/A",
    energy_rating: details.energy_rating || "N/A",
    address: details.address || "",
    crawler: row.crawler,
    created: row.created,
    price_numeric,
    size_numeric,
    price_per_sqm,
    favorite,
  });
}
