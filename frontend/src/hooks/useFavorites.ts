import useSWR, { useSWRConfig } from "swr";
import type { Favorite, FavoriteStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useFavorites() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<Favorite[]>(
    "/api/favorites",
    fetcher
  );

  async function revalidateRelated() {
    await Promise.all([
      mutate(),
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/exposes")
      ),
    ]);
  }

  async function addFavorite(exposeId: number, crawler: string) {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expose_id: exposeId, crawler }),
    });
    await revalidateRelated();
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
    await revalidateRelated();
  }

  async function removeFavorite(exposeId: number, crawler: string) {
    await fetch(`/api/favorites/${exposeId}?crawler=${crawler}`, {
      method: "DELETE",
    });
    await revalidateRelated();
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
