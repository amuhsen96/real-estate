"use client";

import type { PriceEstimate } from "@/lib/priceSimulator";

interface TransportInfoProps {
  estimate: PriceEstimate | null;
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export default function TransportInfo({ estimate }: TransportInfoProps) {
  if (!estimate) return null;
  const { nearestMetro, nearestStadium, metroBonus } = estimate;
  if (!nearestMetro && !nearestStadium) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">المرافق القريبة</h2>
        <p className="text-xs text-gray-400 mt-0.5">أقرب محطة مترو واستاد من الموقع</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Metro Station */}
        {nearestMetro && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Metro icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                  style={{ backgroundColor: nearestMetro.lineColor }}
                >
                  م
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{nearestMetro.nameAr}</p>
                  <p className="text-xs mt-0.5" style={{ color: nearestMetro.lineColor }}>
                    {nearestMetro.lineNameAr}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {formatDist(nearestMetro.distKm)}
                    </span>
                    {metroBonus && metroBonus > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        +{metroBonus} للموقع
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <a
                href={nearestMetro.routeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                المسار ←
              </a>
            </div>
          </div>
        )}

        {/* Stadium */}
        {nearestStadium && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Stadium icon */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-600 text-white text-lg font-bold shrink-0">
                  🏟
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{nearestStadium.nameAr}</p>
                  {nearestStadium.teams.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {nearestStadium.teams.join(" · ")}
                    </p>
                  )}
                  <span className="inline-block mt-1.5 text-xs bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {formatDist(nearestStadium.distKm)}
                  </span>
                </div>
              </div>
              <a
                href={nearestStadium.routeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                المسار ←
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
