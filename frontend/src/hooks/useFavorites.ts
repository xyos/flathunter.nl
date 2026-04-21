import useSWR from "swr";
import type { Favorite, FavoriteStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useFavorites() {
  const { data, error, isLoading, mutate } = useSWR<Favorite[]>(
    "/api/favorites",
    fetcher
  );

  async function addFavorite(exposeId: number, crawler: string) {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expose_id: exposeId, crawler }),
    });
    mutate();
  }

  async function updateFavorite(
    exposeId: number,
    crawler: string,
    updates: { rating?: number; status?: FavoriteStatus; notes?: string }
  ) {
    await fetch(`/api/favorites/${exposeId}?crawler=${crawler}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutate();
  }

  async function removeFavorite(exposeId: number, crawler: string) {
    await fetch(`/api/favorites/${exposeId}?crawler=${crawler}`, {
      method: "DELETE",
    });
    mutate();
  }

  return {
    favorites: data || [],
    error,
    isLoading,
    mutate,
    addFavorite,
    updateFavorite,
    removeFavorite,
  };
}
