"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "./FavoriteButton";
import { buildExposeHrefFromExpose } from "@/lib/expose-links";
import { formatPrice, formatPricePerSqm } from "@/lib/parse";
import { MapPin, Maximize2, DoorOpen, Zap, ExternalLink } from "lucide-react";
import type { ExposeWithFavorite } from "@/lib/types";

interface ExposeCardProps {
  expose: ExposeWithFavorite;
  onToggleFavorite: (exposeId: number, crawler: string) => void;
}

export function ExposeCard({ expose, onToggleFavorite }: ExposeCardProps) {
  const router = useRouter();
  const href = buildExposeHrefFromExpose(expose);

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
    >
      <div className="relative aspect-[16/10] bg-muted">
        {expose.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={expose.image}
            alt={expose.title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <FavoriteButton
            isFavorite={!!expose.favorite}
            onToggle={() => onToggleFavorite(expose.id, expose.crawler)}
            className="bg-white/80 hover:bg-white"
          />
          <a
            href={expose.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-white/80 hover:bg-white text-muted-foreground hover:text-foreground transition"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <Badge className="absolute top-2 left-2" variant="secondary">
          {expose.crawler}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold truncate group-hover:underline">
          {expose.title}
        </h3>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{expose.address}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatPrice(expose.price_numeric)}
          </span>
          {expose.price_per_sqm && (
            <span className="text-sm text-muted-foreground">
              {formatPricePerSqm(expose.price_per_sqm)}
            </span>
          )}
        </div>

        <div className="flex gap-3 text-sm text-muted-foreground">
          {expose.size !== "N/A" && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3.5 w-3.5" />
              {expose.size}
            </span>
          )}
          {expose.rooms !== "N/A" && (
            <span className="flex items-center gap-1">
              <DoorOpen className="h-3.5 w-3.5" />
              {expose.rooms} rooms
            </span>
          )}
          {expose.energy_rating !== "N/A" && expose.energy_rating !== "Not available" && (
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              {expose.energy_rating}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
