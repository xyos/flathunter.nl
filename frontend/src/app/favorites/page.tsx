"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useExposes } from "@/hooks/useExposes";
import { useFavorites } from "@/hooks/useFavorites";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotesEditor } from "@/components/NotesEditor";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatPrice, formatPricePerSqm } from "@/lib/parse";
import { buildExposeHrefFromExpose } from "@/lib/expose-links";
import { FAVORITE_STATUSES } from "@/lib/favorites";
import { Download, Star, ExternalLink, MapPin, ArrowUpRight } from "lucide-react";
import type { ExposeWithFavorite, FavoriteStatus } from "@/lib/types";

function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (r: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} onClick={() => onChange(star)} className="p-0.5">
          <Star
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const { data } = useExposes({ limit: 100 });
  const { updateFavorite, removeFavorite } = useFavorites();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const favoriteExposes: ExposeWithFavorite[] = (data?.exposes || []).filter(
    (e) => e.favorite
  );

  const filtered =
    statusFilter === "all"
      ? favoriteExposes
      : favoriteExposes.filter((e) => e.favorite?.status === statusFilter);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "Title",
      "Address",
      "Price",
      "Size",
      "Rooms",
      "Price/m²",
      "Status",
      "Rating",
      "Notes",
      "URL",
    ];
    const rows = filtered.map((e) => [
      e.title,
      e.address,
      e.price,
      e.size,
      e.rooms,
      e.price_per_sqm ? String(e.price_per_sqm) : "",
      e.favorite?.status || "",
      e.favorite?.rating ? String(e.favorite.rating) : "",
      e.favorite?.notes || "",
      e.url,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "favorites.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handleRemove = useCallback(
    async (exposeId: number, crawler: string) => {
      await removeFavorite(exposeId, crawler);
    },
    [removeFavorite]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Favorites ({filtered.length})</h1>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {FAVORITE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No favorites yet. Heart a listing to add it here.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((expose) => (
            <Card key={`${expose.id}-${expose.crawler}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {expose.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={expose.image}
                      alt={expose.title}
                      className="w-40 h-28 object-cover rounded-md shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={buildExposeHrefFromExpose(expose)}
                          className="font-semibold hover:underline"
                        >
                          {expose.title}
                        </Link>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {expose.address}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={buildExposeHrefFromExpose(expose)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        <a
                          href={expose.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <FavoriteButton
                          isFavorite={true}
                          onToggle={() =>
                            handleRemove(expose.id, expose.crawler)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center text-sm">
                      <span className="font-bold text-primary">
                        {formatPrice(expose.price_numeric)}
                      </span>
                      {expose.price_per_sqm && (
                        <span className="text-muted-foreground">
                          {formatPricePerSqm(expose.price_per_sqm)}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {expose.size}
                      </span>
                      <span className="text-muted-foreground">
                        {expose.rooms} rooms
                      </span>
                      <Badge variant="secondary">{expose.crawler}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <StarRating
                        rating={expose.favorite?.rating || 0}
                        onChange={(r) =>
                          updateFavorite(expose.id, expose.crawler, {
                            rating: r,
                          })
                        }
                      />
                      <Select
                        value={expose.favorite?.status || "new"}
                        onValueChange={(v) =>
                          updateFavorite(expose.id, expose.crawler, {
                            status: v as FavoriteStatus,
                          })
                        }
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FAVORITE_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <NotesEditor
                      notes={expose.favorite?.notes || ""}
                      onSave={(notes) =>
                        updateFavorite(expose.id, expose.crawler, { notes })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
