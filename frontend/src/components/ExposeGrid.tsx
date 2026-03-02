"use client";

import { ExposeCard } from "./ExposeCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ExposeWithFavorite } from "@/lib/types";

interface ExposeGridProps {
  exposes: ExposeWithFavorite[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onToggleFavorite: (exposeId: number, crawler: string) => void;
}

export function ExposeGrid({
  exposes,
  total,
  page,
  limit,
  onPageChange,
  onToggleFavorite,
}: ExposeGridProps) {
  const totalPages = Math.ceil(total / limit);

  if (exposes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No listings found matching your filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {exposes.map((expose) => (
          <ExposeCard
            key={`${expose.id}-${expose.crawler}`}
            expose={expose}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} listings)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
