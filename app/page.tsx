"use client";

import { useState } from "react";
import Link from "next/link";
import LocationInput, { type SearchParams } from "@/components/LocationInput";
import SatelliteView from "@/components/SatelliteView";
import PriceEstimate from "@/components/PriceEstimate";
import TransportInfo from "@/components/TransportInfo";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

export default function Home() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateType | null>(null);
  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (params: SearchParams) => {
    setCoordinates({ lat: params.lat, lng: params.lng });
    setIsLoading(true);
    setError("");
    setPriceEstimate(null);
    setDetectedDistrict(null);

    try {
      const priceRes = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: params.lat,
          lng: params.lng,
          propertyType: params.propertyType,
          area: params.area,
        }),
      });

      if (!priceRes.ok) {
        const data = await priceRes.json();
        setError(data.error || "حدث خطأ أثناء حساب الأسعار");
        return;
      }

      // الحي يأتي من استجابة الأسعار (كشفه الـ API داخلياً)
      const { detectedDistrict: district, ...estimate } = await priceRes.json();
      setPriceEstimate(estimate);
      setDetectedDistrict(params.placeName ?? district ?? null);
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
            <TransportInfo estimate={priceEstimate} />
            <PriceEstimate
              estimate={priceEstimate}
              isLoading={isLoading}
              detectedDistrict={detectedDistrict}
            />
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
