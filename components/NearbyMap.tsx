"use client";

import { useEffect, useRef } from "react";
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

export default function NearbyMap({ coordinates, categories }: NearbyMapProps) {
  const { lang } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let destroyed = false;

    import("leaflet").then((L) => {
      if (destroyed || !mapRef.current) return;

      // Fix default icon path issue in Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([coordinates.lat, coordinates.lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
    });

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates.lat, coordinates.lng]);

  return (
    <div
      ref={mapRef}
      style={{ height: "420px", width: "100%", borderRadius: "0 0 1rem 1rem" }}
    />
  );
}
