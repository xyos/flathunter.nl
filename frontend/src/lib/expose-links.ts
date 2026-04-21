import type { ExposeWithFavorite } from "@/lib/types";

export function buildExposeHref(id: number, crawler: string): string {
  return `/exposes/${id}?crawler=${encodeURIComponent(crawler)}`;
}

export function buildExposeHrefFromExpose(expose: ExposeWithFavorite): string {
  return buildExposeHref(expose.id, expose.crawler);
}
