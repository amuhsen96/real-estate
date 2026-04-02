"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import { useI18n } from "@/lib/i18n";

interface Place {
  name: string;
  vicinity?: string;
  distance: number | null;
  lat?: number;
  lng?: number;
}

interface Category {
  category: string;
  categoryAr: string;
  icon: string;
  places: Place[];
}

interface NearbyMapProps {
  coordinates: Coordinates;
  categories: Category[];
}

const LEAFLET_CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";

const CATEGORY_COLORS: Record<string, string> = {
  restaurant:       "#f97316",
  shopping_mall:    "#a855f7",
  school:           "#3b82f6",
  hospital:         "#ef4444",
  place_of_worship: "#14b8a6",
  park:             "#22c55e",
  bank:             "#ca8a04",
  gas_station:      "#6b7280",
  supermarket:      "#f59e0b",
  pharmacy:         "#ec4899",
};

function loadLeaflet(): Promise<typeof import("leaflet")> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);

  return new Promise((resolve, reject) => {
    // Check if script is already loading
    const existing = document.querySelector(`script[src="${LEAFLET_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(w.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_CDN;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function NearbyMap({ coordinates, categories }: NearbyMapProps) {
  const { lang } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = await loadLeaflet();
    if (!mapRef.current) return;

    const map = L.map(mapRef.current).setView([coordinates.lat, coordinates.lng], 13);
    mapInstanceRef.current = map;

    // Fix gray tiles: force recalculate after container is fully rendered
    setTimeout(() => map.invalidateSize(), 200);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // 5km radius circle
    L.circle([coordinates.lat, coordinates.lng], {
      radius: 5000,
      color: "#3b82f6",
      fillColor: "#3b82f6",
      fillOpacity: 0.05,
      dashArray: "10, 8",
      weight: 2,
    }).addTo(map);

    // Property marker (large red)
    const propLabel = lang === "en" ? "Property" : "العقار";
    L.circleMarker([coordinates.lat, coordinates.lng], {
      radius: 10,
      fillColor: "#dc2626",
      color: "white",
      weight: 2.5,
      fillOpacity: 1,
    }).addTo(map).bindPopup(`<b>${propLabel}</b><br>${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`);

    // POI markers
    categories.forEach((cat) => {
      const color = CATEGORY_COLORS[cat.category] ?? "#6b7280";
      cat.places.forEach((place) => {
        if (place.lat == null || place.lng == null) return;
        const dist = place.distance != null
          ? place.distance < 1000
            ? `${place.distance} ${lang === "en" ? "m" : "م"}`
            : `${(place.distance / 1000).toFixed(1)} ${lang === "en" ? "km" : "كم"}`
          : "";
        L.circleMarker([place.lat, place.lng], {
          radius: 6,
          fillColor: color,
          color: "white",
          weight: 1.5,
          fillOpacity: 0.85,
        }).addTo(map).bindPopup(
          `<b>${place.name}</b><br><span style="color:#6b7280">${cat.icon} ${cat.categoryAr}</span>${dist ? `<br>${dist}` : ""}`
        );
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates.lat, coordinates.lng]);

  useEffect(() => {
    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initMap]);

  return (
    <div
      ref={mapRef}
      style={{ height: "420px", width: "100%", borderRadius: "0 0 1rem 1rem" }}
    />
  );
}
