"use client";

import { useState } from "react";
import Link from "next/link";
import LocationInput from "@/components/LocationInput";
import SatelliteView from "@/components/SatelliteView";
import PriceEstimate from "@/components/PriceEstimate";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

export default function Home() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (coords: Coordinates) => {
    setCoordinates(coords);
    setIsLoading(true);
    setError("");
    setPriceEstimate(null);

    try {
      const priceRes = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
      });

      if (!priceRes.ok) {
        const data = await priceRes.json();
        setError(data.error || "حدث خطأ أثناء حساب الأسعار");
        return;
      }

      const priceData = await priceRes.json();
      setPriceEstimate(priceData);
    } catch {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-end">
          <Link
            href="/data"
            className="text-xs bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 px-4 py-2 rounded-full shadow-sm transition-colors"
          >
            إدارة بيانات الصفقات ←
          </Link>
        </div>
        <LocationInput onSearch={handleSearch} isLoading={isLoading} />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {coordinates && (
          <div className="space-y-6">
            <SatelliteView coordinates={coordinates} />
            <PriceEstimate estimate={priceEstimate} isLoading={isLoading} />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4">
          <p>محلل موقع العقار - تقديرات مبنية على بيانات السوق</p>
          <p className="mt-1">
            الأسعار تقديرية وليست فعلية - للتقييم الدقيق راجع مقيّم عقاري معتمد
          </p>
        </footer>
      </div>
    </div>
  );
}
