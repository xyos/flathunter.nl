import type { FavoriteStatus } from "@/lib/types";

export const FAVORITE_STATUSES: { value: FavoriteStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "viewed", label: "Viewed" },
  { value: "contacted", label: "Contacted" },
  { value: "visited", label: "Visited" },
  { value: "offer_made", label: "Offer Made" },
  { value: "won", label: "Won" },
  { value: "rejected", label: "Rejected" },
];
