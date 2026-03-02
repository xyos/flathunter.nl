"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Home, Euro, Ruler, BarChart3 } from "lucide-react";
import { formatPrice, formatPricePerSqm } from "@/lib/parse";

interface StatsCardsProps {
  total: number;
  avgPrice: number | null;
  medianPrice: number | null;
  avgPricePerSqm: number | null;
}

export function StatsCards({ total, avgPrice, medianPrice, avgPricePerSqm }: StatsCardsProps) {
  const stats = [
    { label: "Total Listings", value: String(total), icon: Home },
    { label: "Avg Price", value: formatPrice(avgPrice), icon: Euro },
    { label: "Median Price", value: formatPrice(medianPrice), icon: BarChart3 },
    { label: "Avg Price/m²", value: formatPricePerSqm(avgPricePerSqm), icon: Ruler },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-semibold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
