import { NextRequest, NextResponse } from "next/server";
import { getExposeById, getFavorite } from "@/lib/db";
import { parsePrice, parseSize, computePricePerSqm } from "@/lib/parse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const crawler = request.nextUrl.searchParams.get("crawler") || "";

  const row = await getExposeById(Number(id), crawler);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const details = row.details as Record<string, string | undefined>;
  const price_numeric = parsePrice(details.price || "");
  const size_numeric = parseSize(details.size || "");
  const price_per_sqm = computePricePerSqm(price_numeric, size_numeric);
  const favorite = (await getFavorite(row.id, row.crawler)) ?? undefined;

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
