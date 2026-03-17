"use client";

import { useState } from "react";

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
  { label: "500 م", value: 500 },
  { label: "1.5 كم", value: 1500 },
  { label: "3 كم", value: 3000 },
  { label: "5 كم", value: 5000 },
];

function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 1000) return `${meters} م`;
  return `${(meters / 1000).toFixed(1)} كم`;
}

export default function NearbyPlaces({ categories, isLoading }: NearbyPlacesProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [zoomRadius, setZoomRadius] = useState<number>(5000);

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    places: cat.places.filter(
      (p) => p.distance === null || p.distance <= zoomRadius
    ),
  }));

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          الأنشطة المحيطة
        </h2>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!categories.length) return null;

  const totalPlaces = filteredCategories.reduce(
    (sum, cat) => sum + cat.places.length,
    0
  );
  const activeCats = filteredCategories.filter((c) => c.places.length > 0).length;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">الأنشطة المحيطة</h2>
        <p className="text-sm text-gray-500 mt-1">
          تم العثور على {totalPlaces} نشاط في {activeCats} فئات
        </p>

        {/* Zoom level filter */}
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
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {filteredCategories.map((cat) => (
          <div key={cat.category}>
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === cat.category ? null : cat.category
                )
              }
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="text-right">
                  <span className="font-semibold text-gray-800">
                    {cat.categoryAr}
                  </span>
                  <span
                    className={`text-sm mr-2 ${
                      cat.places.length > 0
                        ? "text-blue-600 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    ({cat.places.length})
                  </span>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedCategory === cat.category ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedCategory === cat.category && cat.places.length > 0 && (
              <div className="px-6 pb-4">
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                  {cat.places.map((place, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {place.name}
                        </p>
                        {place.vicinity && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {place.vicinity}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 mr-3">
                        {place.distance !== null && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {formatDistance(place.distance)}
                          </span>
                        )}
                        {place.rating && (
                          <div className="flex items-center gap-1 text-sm text-amber-600">
                            <span>{place.rating}</span>
                            <svg
                              className="w-4 h-4 fill-amber-400"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
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
                  لم يتم العثور على أماكن في نطاق{" "}
                  {ZOOM_LEVELS.find((l) => l.value === zoomRadius)?.label}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
