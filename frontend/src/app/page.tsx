"use client";

import { useState, useCallback } from "react";
import { useExposes, useStats } from "@/hooks/useExposes";
import { useFavorites } from "@/hooks/useFavorites";
import { FilterBar } from "@/components/FilterBar";
import { StatsCards } from "@/components/StatsCards";
import { ExposeGrid } from "@/components/ExposeGrid";
import type { ExposeFilters } from "@/lib/types";

export default function ListingsPage() {
  const [filters, setFilters] = useState<ExposeFilters>({
    sort: "newest",
    order: "desc",
    page: 1,
    limit: 24,
  });

  const { data, isLoading } = useExposes(filters);
  const { data: stats } = useStats({ crawler: filters.crawler });
  const { addFavorite, removeFavorite, favorites } = useFavorites();

  const handleToggleFavorite = useCallback(
    async (exposeId: number, crawler: string) => {
      const isFav = favorites.some(
        (f) => f.expose_id === exposeId && f.crawler === crawler
      );
      if (isFav) {
        await removeFavorite(exposeId, crawler);
      } else {
        await addFavorite(exposeId, crawler);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onChange={setFilters} />

      {stats && (
        <StatsCards
          total={stats.total}
          avgPrice={stats.avgPrice}
          medianPrice={stats.medianPrice}
          avgPricePerSqm={stats.avgPricePerSqm}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[320px] rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : data ? (
        <ExposeGrid
          exposes={data.exposes}
          total={data.total}
          page={data.page}
          limit={data.limit}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : null}
    </div>
  );
}
