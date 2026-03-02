"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useExposes, useStats } from "@/hooks/useExposes";
import { FilterBar } from "@/components/FilterBar";
import type { ExposeFilters } from "@/lib/types";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-[600px] rounded-lg bg-muted animate-pulse" /> }
);

export default function MapPage() {
  const [filters, setFilters] = useState<ExposeFilters>({
    limit: 100,
  });

  const { data } = useExposes(filters);
  const { data: stats } = useStats();

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="flex gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-600" /> Below avg €/m²
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-600" /> Near avg €/m²
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-600" /> Above avg €/m²
        </span>
      </div>

      {data && (
        <MapView
          exposes={data.exposes}
          avgPricePerSqm={stats?.avgPricePerSqm || null}
        />
      )}
    </div>
  );
}
