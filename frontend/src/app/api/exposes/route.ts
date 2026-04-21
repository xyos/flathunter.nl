import { NextRequest, NextResponse } from "next/server";
import { getAllExposes, getAllFavorites } from "@/lib/db";
import { parsePrice, parseSize, computePricePerSqm } from "@/lib/parse";
import type { ExposeWithFavorite } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const minPrice = params.get("minPrice") ? Number(params.get("minPrice")) : undefined;
  const maxPrice = params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined;
  const minSize = params.get("minSize") ? Number(params.get("minSize")) : undefined;
  const maxSize = params.get("maxSize") ? Number(params.get("maxSize")) : undefined;
  const rooms = params.get("rooms") ? Number(params.get("rooms")) : undefined;
  const energy = params.get("energy") || undefined;
  const crawler = params.get("crawler") || undefined;
  const search = params.get("search") || undefined;
  const sort = params.get("sort") || "newest";
  const order = params.get("order") || (sort === "newest" ? "desc" : "asc");
  const page = Math.max(1, Number(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || "24")));

  const [raw, favRows] = await Promise.all([getAllExposes(), getAllFavorites()]);
  const favMap = new Map(favRows.map((f) => [`${f.expose_id}-${f.crawler}`, f]));

  let exposes: ExposeWithFavorite[] = raw.map((row) => {
    const details = row.details as Record<string, string | undefined>;
    const price_numeric = parsePrice(details.price || "");
    const size_numeric = parseSize(details.size || "");
    const price_per_sqm = computePricePerSqm(price_numeric, size_numeric);
    const favorite = favMap.get(`${row.id}-${row.crawler}`) || undefined;

    return {
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
    };
  });

  if (minPrice) exposes = exposes.filter((e) => e.price_numeric !== null && e.price_numeric >= minPrice);
  if (maxPrice) exposes = exposes.filter((e) => e.price_numeric !== null && e.price_numeric <= maxPrice);
  if (minSize) exposes = exposes.filter((e) => e.size_numeric !== null && e.size_numeric >= minSize);
  if (maxSize) exposes = exposes.filter((e) => e.size_numeric !== null && e.size_numeric <= maxSize);
  if (rooms) exposes = exposes.filter((e) => {
    const r = e.rooms ? parseInt(e.rooms) : null;
    return r !== null && r >= rooms;
  });
  if (energy) exposes = exposes.filter((e) => e.energy_rating.toUpperCase() === energy.toUpperCase());
  if (crawler) exposes = exposes.filter((e) => e.crawler.toLowerCase() === crawler.toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    exposes = exposes.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q)
    );
  }

  const dir = order === "desc" ? -1 : 1;
  exposes.sort((a, b) => {
    switch (sort) {
      case "price":
        return ((a.price_numeric ?? Infinity) - (b.price_numeric ?? Infinity)) * dir;
      case "price_per_sqm":
        return ((a.price_per_sqm ?? Infinity) - (b.price_per_sqm ?? Infinity)) * dir;
      case "size":
        return ((a.size_numeric ?? 0) - (b.size_numeric ?? 0)) * dir;
      case "newest":
      default:
        return (new Date(a.created).getTime() - new Date(b.created).getTime()) * dir;
    }
  });

  const total = exposes.length;
  const paginated = exposes.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ exposes: paginated, total, page, limit });
}
