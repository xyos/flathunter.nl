import useSWR from "swr";
import type { ExposeWithFavorite, ExposeFilters, StatsData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildQuery(filters: ExposeFilters): string {
  const params = new URLSearchParams();
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minSize) params.set("minSize", String(filters.minSize));
  if (filters.maxSize) params.set("maxSize", String(filters.maxSize));
  if (filters.rooms) params.set("rooms", String(filters.rooms));
  if (filters.energy) params.set("energy", filters.energy);
  if (filters.crawler) params.set("crawler", filters.crawler);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params.toString();
}

export function useExposes(filters: ExposeFilters = {}) {
  const query = buildQuery(filters);
  const { data, error, isLoading, mutate } = useSWR<{
    exposes: ExposeWithFavorite[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/exposes?${query}`, fetcher);

  return { data, error, isLoading, mutate };
}

export function useExpose(id: number, crawler: string) {
  const { data, error, isLoading, mutate } = useSWR<ExposeWithFavorite>(
    `/api/exposes/${id}?crawler=${crawler}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}

export function useStats(filters: ExposeFilters = {}) {
  const query = buildQuery(filters);
  const { data, error, isLoading } = useSWR<StatsData>(
    `/api/stats?${query}`,
    fetcher
  );
  return { data, error, isLoading };
}
