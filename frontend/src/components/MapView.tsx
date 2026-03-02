"use client";

import { useEffect, useState, useRef } from "react";
import type { ExposeWithFavorite, GeoCache } from "@/lib/types";
import { formatPrice, formatPricePerSqm } from "@/lib/parse";

interface MapViewProps {
  exposes: ExposeWithFavorite[];
  avgPricePerSqm: number | null;
}

export function MapView({ exposes, avgPricePerSqm }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoCache[]>([]);
  const [loading, setLoading] = useState(true);
  const mapInstance = useRef<L.Map | null>(null);

  // Fetch geocode data
  useEffect(() => {
    const addresses = exposes
      .map((e) => e.address)
      .filter((a) => a && a !== "N/A");
    if (addresses.length === 0) {
      setLoading(false);
      return;
    }

    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses }),
    })
      .then((r) => r.json())
      .then((data) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exposes]);

  // Initialize map
  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      // @ts-expect-error CSS import for leaflet
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([52.07, 4.3], 12);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Create address-to-expose map
      const addrMap = new Map<string, ExposeWithFavorite>();
      exposes.forEach((e) => addrMap.set(e.address, e));

      const bounds: [number, number][] = [];

      geoData.forEach((geo) => {
        const expose = addrMap.get(geo.address);
        if (!expose) return;

        bounds.push([geo.lat, geo.lng]);

        // Color by price/m² relative to average
        const avg = avgPricePerSqm || 5000;
        const ratio = (expose.price_per_sqm || avg) / avg;
        const color = ratio <= 1 ? "#16a34a" : ratio <= 1.2 ? "#ca8a04" : "#dc2626";

        const marker = L.circleMarker([geo.lat, geo.lng], {
          radius: 8,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 0.8,
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:200px">
            ${expose.image ? `<img src="${expose.image}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px" />` : ""}
            <strong>${expose.title}</strong><br/>
            <span>${formatPrice(expose.price_numeric)}</span>
            ${expose.price_per_sqm ? ` &middot; ${formatPricePerSqm(expose.price_per_sqm)}` : ""}<br/>
            <span>${expose.size} &middot; ${expose.rooms} rooms</span><br/>
            <a href="${expose.url}" target="_blank" rel="noopener">View on ${expose.crawler}</a>
          </div>
        `);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, geoData, exposes, avgPricePerSqm]);

  if (loading) {
    return (
      <div className="h-[600px] rounded-lg bg-muted animate-pulse flex items-center justify-center text-muted-foreground">
        Geocoding addresses...
      </div>
    );
  }

  return <div ref={mapRef} className="h-[600px] rounded-lg border" />;
}
