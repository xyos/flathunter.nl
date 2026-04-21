"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FavoriteButton } from "@/components/FavoriteButton";
import { NotesEditor } from "@/components/NotesEditor";
import { useExpose } from "@/hooks/useExposes";
import { useFavorites } from "@/hooks/useFavorites";
import { buildExposeHref } from "@/lib/expose-links";
import { FAVORITE_STATUSES } from "@/lib/favorites";
import { formatPrice, formatPricePerSqm } from "@/lib/parse";
import type { FavoriteStatus } from "@/lib/types";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Heart,
  MapPin,
  Maximize2,
  DoorOpen,
  Zap,
  Star,
  Building2,
} from "lucide-react";

function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded-sm p-0.5"
          aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
        >
          <Star
            className={`h-5 w-5 ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExposeDetailClientProps {
  exposeId: number;
  crawler: string;
}

export function ExposeDetailClient({
  exposeId,
  crawler,
}: ExposeDetailClientProps) {
  const { data: expose, isLoading } = useExpose(exposeId, crawler);
  const { addFavorite, removeFavorite, updateFavorite } = useFavorites();

  const createdLabel = !expose?.created
    ? "Unknown"
    : new Intl.DateTimeFormat("nl-NL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(expose.created));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="aspect-[16/10] animate-pulse rounded-2xl bg-muted" />
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!expose) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="space-y-3 p-8 text-center">
          <p className="text-lg font-semibold">Listing not found</p>
          <p className="text-sm text-muted-foreground">
            This listing may have been removed or the crawler parameter is
            missing.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Return to listings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const href = buildExposeHref(expose.id, expose.crawler);
  const isFavorite = !!expose.favorite;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listings
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={() =>
              isFavorite
                ? removeFavorite(expose.id, expose.crawler)
                : addFavorite(expose.id, expose.crawler)
            }
            className="h-10 w-10 rounded-full border bg-background"
          />
          <Button asChild variant="outline">
            <a href={expose.url} target="_blank" rel="noopener noreferrer">
              Original listing
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border bg-card">
            <div className="absolute left-4 top-4 z-10 flex gap-2">
              <Badge variant="secondary">{expose.crawler}</Badge>
              {isFavorite ? <Badge>Favorite</Badge> : null}
            </div>
            {expose.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={expose.image}
                alt={expose.title}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-muted text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {expose.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {expose.address || "Address unavailable"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" />
                    Added {createdLabel}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border bg-card px-4 py-3 text-right">
                <p className="text-sm text-muted-foreground">Asking price</p>
                <p className="text-3xl font-semibold text-primary">
                  {formatPrice(expose.price_numeric)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatPricePerSqm(expose.price_per_sqm)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Surface"
                value={expose.size}
                icon={Maximize2}
              />
              <StatCard label="Rooms" value={expose.rooms} icon={DoorOpen} />
              <StatCard
                label="Energy"
                value={expose.energy_rating}
                icon={Zap}
              />
              <StatCard label="Source" value={expose.crawler} icon={Building2} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Favorite workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isFavorite ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status</p>
                    <Select
                      value={expose.favorite?.status || "new"}
                      onValueChange={(value) =>
                        updateFavorite(expose.id, expose.crawler, {
                          status: value as FavoriteStatus,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose status" />
                      </SelectTrigger>
                      <SelectContent>
                        {FAVORITE_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Rating</p>
                    <StarRating
                      rating={expose.favorite?.rating || 0}
                      onChange={(rating) =>
                        updateFavorite(expose.id, expose.crawler, { rating })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Notes</p>
                    <NotesEditor
                      notes={expose.favorite?.notes || ""}
                      onSave={(notes) =>
                        updateFavorite(expose.id, expose.crawler, { notes })
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4 rounded-2xl border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    Save this listing to track its status, score it, and add
                    your own notes.
                  </p>
                  <Button onClick={() => addFavorite(expose.id, expose.crawler)}>
                    <Heart className="mr-2 h-4 w-4" />
                    Add to favorites
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Link href={href} className="block text-muted-foreground">
                Shareable dashboard URL
              </Link>
              <a
                href={expose.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground"
              >
                Open original listing
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
