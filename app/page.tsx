"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import LocationInput, { type SearchParams } from "@/components/LocationInput";
import SatelliteView from "@/components/SatelliteView";
import PriceEstimate from "@/components/PriceEstimate";
import TransportInfo from "@/components/TransportInfo";
import NearbyPlaces from "@/components/NearbyPlaces";
import ExportPDFButtons from "@/components/ExportPDFButtons";
import LanguageToggle from "@/components/LanguageToggle";
import type { ReportData } from "@/components/PropertyReport";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t, lang } = useI18n();
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateType | null>(null);
  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nearbyData, setNearbyData] = useState<{ category: string; categoryAr: string; icon: string; places: { name: string; vicinity: string; rating: number | null; distance: number | null; lat?: number; lng?: number }[] }[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyProvider, setNearbyProvider] = useState<"overpass" | "apify" | "outscraper">("overpass");
  const [isNearbyProviderLoading, setIsNearbyProviderLoading] = useState(false);
  const [nearbyProviderError, setNearbyProviderError] = useState<string | null>(null);
  // cache: نتائج كل مزود عند الإحداثيات الحالية — التبديل المرة الثانية فوري
  const nearbyCache = useRef<Partial<Record<"overpass" | "apify" | "outscraper", typeof nearbyData>>>({});

  const handleSearch = async (params: SearchParams) => {
    setCoordinates({ lat: params.lat, lng: params.lng });
    setSearchParams(params);
    setIsLoading(true);
    setNearbyLoading(true);
    setNearbyData([]);
    setNearbyProvider("overpass");
    nearbyCache.current = {};   // مسح الـ cache عند كل موقع جديد
    setError("");
    setPriceEstimate(null);
    setDetectedDistrict(null);

    // Fetch nearby services in parallel
    fetch("/api/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: params.lat, lng: params.lng, provider: "overpass" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) {
          nearbyCache.current.overpass = d.categories;  // حفظ في الـ cache
          setNearbyData(d.categories);
        }
      })
      .catch(() => {})
      .finally(() => setNearbyLoading(false));
    try {
      const priceRes = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: params.lat, lng: params.lng, propertyType: params.propertyType, area: params.area, district: params.district }),
      });
      if (!priceRes.ok) { setError((await priceRes.json()).error || "Error"); return; }
      const { detectedDistrict: autoDistrict, ...estimate } = await priceRes.json();
      setPriceEstimate(estimate);
      setDetectedDistrict(params.district ?? params.placeName ?? autoDistrict ?? null);
    } catch { setError("Connection error."); }
    finally { setIsLoading(false); }
  };

  const handleNearbyProviderChange = async (newProvider: "overpass" | "apify" | "outscraper") => {
    if (!coordinates || isNearbyProviderLoading) return;
    setNearbyProviderError(null);

    // إذا كانت النتائج محفوظة → تبديل فوري بدون API call
    const cached = nearbyCache.current[newProvider];
    if (cached) {
      setNearbyData(cached);
      setNearbyProvider(newProvider);
      return;
    }

    // أول مرة → جلب من الـ API ثم حفظ في الـ cache
    setIsNearbyProviderLoading(true);
    try {
      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coordinates.lat, lng: coordinates.lng, provider: newProvider }),
      });
      const d = await res.json();
      if (d.error) {
        setNearbyProviderError(d.error);
      } else if (d.categories) {
        nearbyCache.current[newProvider] = d.categories;  // حفظ في الـ cache
        setNearbyData(d.categories);
        setNearbyProvider(newProvider);
      }
    } catch {
      setNearbyProviderError("تعذّر الاتصال بالمزود — حاول مجدداً");
    }
    finally { setIsNearbyProviderLoading(false); }
  };

  // حساب النقاط النهائية لتضمينها في التقرير
  const servicesScore = nearbyData.length > 0
    ? nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 8 ? 4.0
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 6 ? 3.2
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 4 ? 2.5
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 2 ? 1.5
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 1 ? 0.8 : 0
    : 0;

  const reportData: ReportData | null = coordinates && priceEstimate ? {
    coords: coordinates,
    estimate: {
      ...priceEstimate,
      locationScore: Math.round(Math.min(10, priceEstimate.locationScore + servicesScore) * 10) / 10,
    },
    district: detectedDistrict,
    propertyType: searchParams?.propertyType, area: searchParams?.area,
    generatedAt: new Date().toLocaleDateString("ar-SA"),
    nearbyCategories: nearbyData.length > 0 ? nearbyData : undefined,
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-end gap-2">
          <LanguageToggle />
          <Link href="/analyze" className="text-xs bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 px-4 py-2 rounded-full shadow-sm transition-colors">
            {t("navAnalyze")}
          </Link>
          <Link href="/data" className="text-xs bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 px-4 py-2 rounded-full shadow-sm transition-colors">
            {t("navData")}
          </Link>
        </div>

        <LocationInput onSearch={handleSearch} isLoading={isLoading} />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-center">{error}</div>}

        {coordinates && (
          <div className="space-y-6">
            <SatelliteView coordinates={coordinates} />
            <NearbyPlaces
              categories={nearbyData}
              isLoading={nearbyLoading}
              provider={nearbyProvider}
              isProviderLoading={isNearbyProviderLoading}
              providerError={nearbyProviderError}
              onProviderChange={handleNearbyProviderChange}
            />
            <TransportInfo estimate={priceEstimate} />
            <PriceEstimate estimate={priceEstimate} isLoading={isLoading} detectedDistrict={detectedDistrict} nearbyCategories={nearbyData} nearbyLoading={nearbyLoading} />
            {priceEstimate && !isLoading && reportData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">{t("exportTitle")}</p>
                <p className="text-xs text-gray-400 mb-4">
                  {nearbyLoading
                    ? (lang === "en" ? "Loading nearby services…" : "جاري تحميل الأنشطة القريبة...")
                    : t("exportSubtitle")}
                </p>
                <ExportPDFButtons reportData={reportData} disabled={nearbyLoading} />
              </div>
            )}
          </div>
        )}

        <footer className="text-center text-xs text-gray-400 py-4">
          <p>{t("appTitle")}</p>
          <p className="mt-1">{t("footerNote")}</p>
        </footer>
      </div>
    </div>
  );
}
