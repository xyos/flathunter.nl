export interface Expose {
  id: number;
  url: string;
  title: string;
  image: string;
  price: string;
  size: string;
  rooms: string;
  energy_rating: string;
  address: string;
  crawler: string;
  created: string;
  // Computed fields
  price_numeric: number | null;
  size_numeric: number | null;
  price_per_sqm: number | null;
}

export interface Favorite {
  expose_id: number;
  crawler: string;
  rating: number | null;
  status: FavoriteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FavoriteStatus =
  | "new"
  | "viewed"
  | "contacted"
  | "visited"
  | "offer_made"
  | "won"
  | "rejected";

export interface ExposeWithFavorite extends Expose {
  favorite?: Favorite;
}

export interface ExposeFilters {
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  rooms?: number;
  energy?: string;
  crawler?: string;
  search?: string;
  sort?: "price" | "price_per_sqm" | "size" | "newest";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface StatsData {
  total: number;
  avgPrice: number | null;
  medianPrice: number | null;
  avgPricePerSqm: number | null;
  priceHistogram: { bucket: string; count: number }[];
  sizeHistogram: { bucket: string; count: number }[];
  energyDistribution: { rating: string; count: number }[];
  neighborhoodComparison: { area: string; avgPricePerSqm: number; count: number }[];
  priceTrend: { week: string; avgPrice: number; medianPrice: number; count: number }[];
}

export interface GeoCache {
  address: string;
  lat: number;
  lng: number;
}
