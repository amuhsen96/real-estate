"use client";

import { useState } from "react";
import LocationInput from "@/components/LocationInput";
import SatelliteView from "@/components/SatelliteView";
import NearbyPlaces from "@/components/NearbyPlaces";
import PriceEstimate from "@/components/PriceEstimate";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

interface Category {
  category: string;
  categoryAr: string;
  icon: string;
  places: {
    name: string;
    vicinity: string;
    rating: number | null;
  }[];
}

export default function Home() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (coords: Coordinates) => {
    setCoordinates(coords);
    setIsLoading(true);
    setIsNearbyLoading(true);
    setIsPriceLoading(true);
    setError("");
    setCategories([]);
    setPriceEstimate(null);

    try {
      // Fetch nearby places
      const nearbyRes = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
      });

      if (!nearbyRes.ok) {
        const data = await nearbyRes.json();
        setError(data.error || "حدث خطأ أثناء البحث");
        setIsLoading(false);
        setIsNearbyLoading(false);
        setIsPriceLoading(false);
        return;
      }

      const nearbyData = await nearbyRes.json();
      setCategories(nearbyData.categories);
      setIsNearbyLoading(false);

      // Fetch price estimates using nearby data
      const priceRes = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          nearby: nearbyData.summary,
        }),
      });

      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setPriceEstimate(priceData);
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم. تأكد من تشغيل التطبيق بشكل صحيح.");
    } finally {
      setIsLoading(false);
      setIsNearbyLoading(false);
      setIsPriceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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
            {/* Satellite Image */}
            <SatelliteView coordinates={coordinates} />

            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nearby Places */}
              <NearbyPlaces
                categories={categories}
                isLoading={isNearbyLoading}
              />

              {/* Price Estimate */}
              <PriceEstimate
                estimate={priceEstimate}
                isLoading={isPriceLoading}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4">
          <p>
            محلل موقع العقار - يستخدم Google Maps API و بيانات محاكاة للأسعار
          </p>
          <p className="mt-1">
            الأسعار تقديرية وليست فعلية - للتقييم الدقيق راجع مقيّم عقاري معتمد
          </p>
        </footer>
      </div>
    </div>
  );
}
