"use client";

import { useI18n } from "@/lib/i18n";
import { type Coordinates } from "@/lib/parseGoogleMapsUrl";

interface SatelliteViewProps {
  coordinates: Coordinates;
}

export default function SatelliteView({ coordinates }: SatelliteViewProps) {
  const { t } = useI18n();
  const { lat, lng } = coordinates;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">{t("aerialTitle")}</h2>
        <p className="text-sm text-gray-500 mt-1" dir="ltr">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
      </div>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/satellite?lat=${lat}&lng=${lng}`} alt={t("aerialTitle")}
          className="w-full h-auto min-h-[300px] object-cover bg-gray-100" loading="eager" />
        <a href={`https://www.google.com/maps/@${lat},${lng},17z`} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg shadow transition-colors">
          {t("openInMaps")}
        </a>
      </div>
    </div>
  );
}
