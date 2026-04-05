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
}

const ZOOM_LEVELS = [
  { labelAr: "500 م",  labelEn: "500 m",  value: 500 },
  { labelAr: "1.5 كم", labelEn: "1.5 km", value: 1500 },
  { labelAr: "3 كم",   labelEn: "3 km",   value: 3000 },
  { labelAr: "5 كم",   labelEn: "5 km",   value: 5000 },
];

export default function NearbyPlaces({ categories, isLoading }: NearbyPlacesProps) {
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
        <h2 className="text-lg font-bold text-gray-800">{titleText}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{subtitleText}</p>

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

      <div className="divide-y divide-gray-50">
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
