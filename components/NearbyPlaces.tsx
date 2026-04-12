"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Place {
  name: string;
  vicinity: string;
  rating: number | null;
  distance: number | null;
}

interface Category {
  category: string;
  categoryAr: string;
  icon: string;
  places: Place[];
}

interface NearbyPlacesProps {
  categories: Category[];
  isLoading: boolean;
  provider?: "overpass" | "apify";
  isProviderLoading?: boolean;
  providerError?: string | null;
  onProviderChange?: (provider: "overpass" | "apify") => void;
}

const ZOOM_LEVELS = [
  { labelAr: "500 م",  labelEn: "500 m",  value: 500 },
  { labelAr: "1.5 كم", labelEn: "1.5 km", value: 1500 },
  { labelAr: "3 كم",   labelEn: "3 km",   value: 3000 },
  { labelAr: "5 كم",   labelEn: "5 km",   value: 5000 },
];

export default function NearbyPlaces({
  categories,
  isLoading,
  provider = "overpass",
  isProviderLoading = false,
  providerError = null,
  onProviderChange,
}: NearbyPlacesProps) {
  const { lang } = useI18n();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [zoomRadius, setZoomRadius] = useState<number>(5000);

  function formatDistance(meters: number | null): string {
    if (meters === null) return "";
    if (meters < 1000) return `${meters} ${lang === "en" ? "m" : "م"}`;
    return `${(meters / 1000).toFixed(1)} ${lang === "en" ? "km" : "كم"}`;
  }

  const titleText = lang === "en" ? "Nearby Services" : "الأنشطة المحيطة";

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    places: cat.places.filter((p) => p.distance === null || p.distance <= zoomRadius),
  }));

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{titleText}</h2>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories.length) return null;

  const totalPlaces = filteredCategories.reduce((sum, cat) => sum + cat.places.length, 0);
  const activeCats  = filteredCategories.filter((c) => c.places.length > 0).length;

  const subtitleText = lang === "en"
    ? `${totalPlaces} services in ${activeCats} categories`
    : `${totalPlaces} نشاط في ${activeCats} فئات`;

  const notFoundText = lang === "en" ? "No places found within " : "لم يتم العثور على أماكن في نطاق ";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{titleText}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitleText}</p>
          </div>

          {/* تبديل المزود */}
          {onProviderChange && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 flex-shrink-0">
              <button
                onClick={() => !isProviderLoading && provider !== "overpass" && onProviderChange("overpass")}
                disabled={isProviderLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  provider === "overpass"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                } ${isProviderLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                OpenStreetMap
              </button>
              <button
                onClick={() => !isProviderLoading && provider !== "apify" && onProviderChange("apify")}
                disabled={isProviderLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  provider === "apify"
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                } ${isProviderLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isProviderLoading && provider !== "apify" ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                )}
                Google Maps
              </button>
            </div>
          )}
        </div>

        {/* شارة مصدر البيانات */}
        {onProviderChange && (
          <div className="mt-2">
            {isProviderLoading ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {lang === "en" ? "Loading from new source…" : "جاري التحميل من المصدر الجديد…"}
              </span>
            ) : provider === "apify" ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                {lang === "en" ? "Source: Google Maps (Apify)" : "المصدر: Google Maps (Apify)"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />
                {lang === "en" ? "Source: OpenStreetMap" : "المصدر: OpenStreetMap (Overpass)"}
              </span>
            )}
          </div>
        )}

        {/* رسالة خطأ المزود */}
        {providerError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {providerError}
          </div>
        )}

        {/* Radius filter */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setZoomRadius(level.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                zoomRadius === level.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {lang === "en" ? level.labelEn : level.labelAr}
            </button>
          ))}
        </div>
      </div>

      <div className={`divide-y divide-gray-50 ${isProviderLoading ? "opacity-40 pointer-events-none" : ""}`}>
        {filteredCategories.map((cat) => (
          <div key={cat.category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="text-right">
                  <span className="font-semibold text-gray-800">{cat.categoryAr}</span>
                  <span className={`text-sm mr-2 ${cat.places.length > 0 ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    ({cat.places.length})
                  </span>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedCategory === cat.category ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedCategory === cat.category && cat.places.length > 0 && (
              <div className="px-6 pb-4">
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                  {cat.places.map((place, idx) => (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{place.name}</p>
                        {place.vicinity && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{place.vicinity}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 mr-3">
                        {place.distance !== null && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {formatDistance(place.distance)}
                          </span>
                        )}
                        {place.rating !== null && (
                          <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                            ★ {place.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedCategory === cat.category && cat.places.length === 0 && (
              <div className="px-6 pb-4">
                <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3 text-center">
                  {notFoundText}{lang === "en" ? ZOOM_LEVELS.find((l) => l.value === zoomRadius)?.labelEn : ZOOM_LEVELS.find((l) => l.value === zoomRadius)?.labelAr}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
