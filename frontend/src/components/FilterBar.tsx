"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { ExposeFilters } from "@/lib/types";

interface FilterBarProps {
  filters: ExposeFilters;
  onChange: (filters: ExposeFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const update = (partial: Partial<ExposeFilters>) =>
    onChange({ ...filters, ...partial, page: 1 });

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search address or title..."
          value={filters.search || ""}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 items-center">
        <Input
          type="number"
          placeholder="Min €"
          className="w-28"
          value={filters.minPrice || ""}
          onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max €"
          className="w-28"
          value={filters.maxPrice || ""}
          onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex gap-2 items-center">
        <Input
          type="number"
          placeholder="Min m²"
          className="w-24"
          value={filters.minSize || ""}
          onChange={(e) => update({ minSize: e.target.value ? Number(e.target.value) : undefined })}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max m²"
          className="w-24"
          value={filters.maxSize || ""}
          onChange={(e) => update({ maxSize: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <Input
        type="number"
        placeholder="Min rooms"
        className="w-28"
        value={filters.rooms || ""}
        onChange={(e) => update({ rooms: e.target.value ? Number(e.target.value) : undefined })}
      />

      <Select
        value={filters.energy || "all"}
        onValueChange={(v) => update({ energy: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Energy" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Energy</SelectItem>
          {["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"].map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.crawler || "all"}
        onValueChange={(v) => update({ crawler: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="Funda">Funda</SelectItem>
          <SelectItem value="Pararius">Pararius</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sort || "newest"}
        onValueChange={(v) =>
          update({
            sort: v as ExposeFilters["sort"],
            order: v === "newest" ? "desc" : "asc",
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="price">Price</SelectItem>
          <SelectItem value="price_per_sqm">Price/m²</SelectItem>
          <SelectItem value="size">Size</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
