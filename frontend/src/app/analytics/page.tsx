"use client";

import { useStats } from "@/hooks/useExposes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#e11d48",
  "#0891b2",
  "#ca8a04",
  "#6366f1",
];

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[350px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price Trend */}
        {stats.priceTrend.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Price Trend (Weekly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.priceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) =>
                      new Intl.NumberFormat("nl-NL", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(Number(value))
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#2563eb"
                    name="Average"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="medianPrice"
                    stroke="#16a34a"
                    name="Median"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Price Histogram */}
        <Card>
          <CardHeader>
            <CardTitle>Price Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.priceHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" fontSize={11} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" name="Listings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Size Histogram */}
        <Card>
          <CardHeader>
            <CardTitle>Size Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.sizeHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" fontSize={11} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" name="Listings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Energy Rating */}
        {stats.energyDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Energy Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.energyDistribution}
                    dataKey="count"
                    nameKey="rating"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {stats.energyDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Neighborhood Comparison */}
        {stats.neighborhoodComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Avg Price/m² by Postal Code</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.neighborhoodComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickFormatter={(v) => `€${v.toLocaleString()}`}
                  />
                  <YAxis type="category" dataKey="area" fontSize={12} width={60} />
                  <Tooltip
                    formatter={(value) =>
                      `€${Number(value).toLocaleString()}/m²`
                    }
                  />
                  <Bar dataKey="avgPricePerSqm" fill="#9333ea" name="Avg €/m²" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
