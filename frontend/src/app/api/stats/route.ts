import { NextRequest, NextResponse } from "next/server";
import { getAllExposes } from "@/lib/db";
import { parsePrice, parseSize, computePricePerSqm, extractPostalPrefix } from "@/lib/parse";

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const crawler = params.get("crawler") || undefined;

  const raw = getAllExposes();

  const enriched = raw.map((row) => {
    const details = JSON.parse(row.details);
    const price_numeric = parsePrice(details.price || "");
    const size_numeric = parseSize(details.size || "");
    return {
      ...details,
      created: row.created,
      crawler: row.crawler,
      price_numeric,
      size_numeric,
      price_per_sqm: computePricePerSqm(price_numeric, size_numeric),
    };
  }).filter((e) => !crawler || e.crawler.toLowerCase() === crawler.toLowerCase());

  const prices = enriched.map((e) => e.price_numeric).filter((p): p is number => p !== null);
  const ppsqm = enriched.map((e) => e.price_per_sqm).filter((p): p is number => p !== null);

  // Price histogram (50K buckets)
  const priceHistogram: { bucket: string; count: number }[] = [];
  if (prices.length > 0) {
    const maxP = Math.max(...prices);
    for (let b = 0; b <= maxP; b += 50000) {
      const count = prices.filter((p) => p >= b && p < b + 50000).length;
      if (count > 0) {
        priceHistogram.push({ bucket: `${b / 1000}K-${(b + 50000) / 1000}K`, count });
      }
    }
  }

  // Size histogram (10m² buckets)
  const sizes = enriched.map((e) => e.size_numeric).filter((s): s is number => s !== null);
  const sizeHistogram: { bucket: string; count: number }[] = [];
  if (sizes.length > 0) {
    const maxS = Math.max(...sizes);
    for (let b = 0; b <= maxS; b += 10) {
      const count = sizes.filter((s) => s >= b && s < b + 10).length;
      if (count > 0) {
        sizeHistogram.push({ bucket: `${b}-${b + 10}m²`, count });
      }
    }
  }

  // Energy distribution
  const energyCounts = new Map<string, number>();
  enriched.forEach((e) => {
    const rating = e.energy_rating || "Unknown";
    if (rating !== "N/A" && rating !== "Not available") {
      energyCounts.set(rating, (energyCounts.get(rating) || 0) + 1);
    }
  });
  const energyDistribution = Array.from(energyCounts.entries())
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => a.rating.localeCompare(b.rating));

  // Neighborhood comparison (by postal prefix)
  const neighborhoods = new Map<string, { total: number; count: number }>();
  enriched.forEach((e) => {
    if (e.price_per_sqm && e.address) {
      const prefix = extractPostalPrefix(e.address);
      if (prefix) {
        const existing = neighborhoods.get(prefix) || { total: 0, count: 0 };
        existing.total += e.price_per_sqm;
        existing.count += 1;
        neighborhoods.set(prefix, existing);
      }
    }
  });
  const neighborhoodComparison = Array.from(neighborhoods.entries())
    .map(([area, data]) => ({
      area,
      avgPricePerSqm: Math.round(data.total / data.count),
      count: data.count,
    }))
    .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm);

  // Price trend (weekly)
  const weekMap = new Map<string, { prices: number[]; count: number }>();
  enriched.forEach((e) => {
    if (e.price_numeric && e.created) {
      const date = new Date(e.created);
      // ISO week start (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date.setDate(diff));
      const key = weekStart.toISOString().split("T")[0];
      const existing = weekMap.get(key) || { prices: [], count: 0 };
      existing.prices.push(e.price_numeric);
      existing.count += 1;
      weekMap.set(key, existing);
    }
  });
  const priceTrend = Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      avgPrice: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
      medianPrice: median(data.prices) || 0,
      count: data.count,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return NextResponse.json({
    total: enriched.length,
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    medianPrice: median(prices),
    avgPricePerSqm: ppsqm.length ? Math.round(ppsqm.reduce((a, b) => a + b, 0) / ppsqm.length) : null,
    priceHistogram,
    sizeHistogram,
    energyDistribution,
    neighborhoodComparison,
    priceTrend,
  });
}
