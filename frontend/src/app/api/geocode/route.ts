import { NextRequest, NextResponse } from "next/server";
import { getGeocacheFor, upsertGeocache } from "@/lib/db";
import type { GeoCache } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { addresses } = await request.json();
  if (!Array.isArray(addresses)) {
    return NextResponse.json({ error: "addresses array required" }, { status: 400 });
  }

  const cached = await getGeocacheFor(addresses);
  const cachedMap = new Map(cached.map((c) => [c.address, c]));
  const results: GeoCache[] = [...cached];
  const toGeocode = addresses.filter((a: string) => !cachedMap.has(a));

  for (const addr of toGeocode) {
    try {
      await new Promise((r) => setTimeout(r, 1100));
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=nl`,
        { headers: { "User-Agent": "flathunter-nl-dashboard/1.0" } }
      );
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const geo: GeoCache = { address: addr, lat: parseFloat(lat), lng: parseFloat(lon) };
        await upsertGeocache(addr, geo.lat, geo.lng);
        results.push(geo);
      }
    } catch (e) {
      console.error(`Geocode failed for ${addr}:`, e);
    }
  }

  return NextResponse.json(results);
}
