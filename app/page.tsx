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
import PriceTrend from "@/components/PriceTrend";
import InvestmentCalc from "@/components/InvestmentCalc";
import RefTransactions from "@/components/RefTransactions";
import CompareView from "@/components/CompareView";
import type { ReportData } from "@/components/PropertyReport";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";
import { useI18n } from "@/lib/i18n";

interface RefTx {
  district: string; propertyType: string; area: number;
  pricePerSqm: number; date: string | null; source: string | null;
}

export default function Home() {
  const { t, lang } = useI18n();

  // ── الموقع الرئيسي ─────────────────────────────────────────────────────────
  const [coordinates, setCoordinates]       = useState<Coordinates | null>(null);
  const [priceEstimate, setPriceEstimate]   = useState<PriceEstimateType | null>(null);
  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);
  const [detectedCity, setDetectedCity]     = useState<string | null>(null);
  const [searchParams, setSearchParams]     = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState("");
  const [refTransactions, setRefTransactions] = useState<RefTx[]>([]);

  // ── الخدمات القريبة ────────────────────────────────────────────────────────
  const [nearbyData, setNearbyData] = useState<{ category: string; categoryAr: string; icon: string; places: { name: string; vicinity: string; rating: number | null; distance: number | null; lat?: number; lng?: number }[] }[]>([]);
  const [nearbyLoading, setNearbyLoading]             = useState(false);
  const [nearbyProvider, setNearbyProvider]           = useState<"overpass" | "apify" | "outscraper">("overpass");
  const [isNearbyProviderLoading, setIsNearbyProviderLoading] = useState(false);
  const [nearbyProviderError, setNearbyProviderError] = useState<string | null>(null);
  const nearbyCache = useRef<Partial<Record<"overpass" | "apify" | "outscraper", typeof nearbyData>>>({});

  // ── وضع المقارنة ───────────────────────────────────────────────────────────
  const [compareMode, setCompareMode]             = useState(false);
  const [compareCoords, setCompareCoords]         = useState<Coordinates | null>(null);
  const [compareEstimate, setCompareEstimate]     = useState<PriceEstimateType | null>(null);
  const [compareDistrict, setCompareDistrict]     = useState<string | null>(null);
  const [compareLoading, setCompareLoading]       = useState(false);
  const [compareError, setCompareError]           = useState("");

  // ── البحث الرئيسي ──────────────────────────────────────────────────────────
  const handleSearch = async (params: SearchParams) => {
    setCoordinates({ lat: params.lat, lng: params.lng });
    setSearchParams(params);
    setIsLoading(true);
    setNearbyLoading(true);
    setNearbyData([]);
    setNearbyProvider("overpass");
    nearbyCache.current = {};
    setError("");
    setPriceEstimate(null);
    setDetectedDistrict(null);
    setDetectedCity(null);
    setRefTransactions([]);
    setCompareMode(false);
    setCompareEstimate(null);

    fetch("/api/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: params.lat, lng: params.lng, provider: "overpass" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) { nearbyCache.current.overpass = d.categories; setNearbyData(d.categories); }
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
      const { detectedDistrict: autoDistrict, refTransactions: refs, ...estimate } = await priceRes.json();
      setPriceEstimate(estimate);
      setRefTransactions(refs ?? []);
      setDetectedDistrict(params.district ?? params.placeName ?? autoDistrict ?? null);
      // استخراج اسم المدينة من الموقع المكتشف
      if (estimate.city) setDetectedCity(estimate.city);
      else {
        // استخلاص اسم المدينة عبر reverse geocode
        fetch("/api/reverse-geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: params.lat, lng: params.lng }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.city) setDetectedCity(d.city); })
          .catch(() => {});
      }
    } catch { setError("Connection error."); }
    finally { setIsLoading(false); }
  };

  // ── تبديل مزود الخدمات ─────────────────────────────────────────────────────
  const handleNearbyProviderChange = async (newProvider: "overpass" | "apify" | "outscraper") => {
    if (!coordinates || isNearbyProviderLoading) return;
    setNearbyProviderError(null);
    const cached = nearbyCache.current[newProvider];
    if (cached) { setNearbyData(cached); setNearbyProvider(newProvider); return; }
    setIsNearbyProviderLoading(true);
    try {
      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coordinates.lat, lng: coordinates.lng, provider: newProvider }),
      });
      const d = await res.json();
      if (d.error) { setNearbyProviderError(d.error); }
      else if (d.categories) { nearbyCache.current[newProvider] = d.categories; setNearbyData(d.categories); setNearbyProvider(newProvider); }
    } catch { setNearbyProviderError("تعذّر الاتصال بالمزود — حاول مجدداً"); }
    finally { setIsNearbyProviderLoading(false); }
  };

  // ── البحث المقارن ──────────────────────────────────────────────────────────
  const handleCompareSearch = async (params: SearchParams) => {
    setCompareCoords({ lat: params.lat, lng: params.lng });
    setCompareLoading(true);
    setCompareError("");
    setCompareEstimate(null);
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: params.lat, lng: params.lng, propertyType: params.propertyType, area: params.area }),
      });
      if (!res.ok) { setCompareError((await res.json()).error || "Error"); return; }
      const { detectedDistrict: cd, refTransactions: _r, ...est } = await res.json();
      setCompareEstimate(est);
      setCompareDistrict(params.district ?? params.placeName ?? cd ?? null);
    } catch { setCompareError("Connection error."); }
    finally { setCompareLoading(false); }
  };

  // ── حساب نقاط الخدمات ─────────────────────────────────────────────────────
  const servicesScore = nearbyData.length > 0
    ? nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 8 ? 4.0
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 6 ? 3.2
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 4 ? 2.5
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 2 ? 1.5
    : nearbyData.filter(c => c.places.some((p: { distance: number | null }) => p.distance != null && p.distance <= 2000)).length >= 1 ? 0.8 : 0
    : 0;

  const reportData: ReportData | null = coordinates && priceEstimate ? {
    coords: coordinates,
    estimate: { ...priceEstimate, locationScore: Math.round(Math.min(10, priceEstimate.locationScore + servicesScore) * 10) / 10 },
    district: detectedDistrict,
    propertyType: searchParams?.propertyType, area: searchParams?.area,
    generatedAt: new Date().toLocaleDateString("ar-SA"),
    nearbyCategories: nearbyData.length > 0 ? nearbyData : undefined,
  } : null;

  const showResults = !!coordinates;
  const showCompare = showResults && priceEstimate && compareMode;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* شريط التنقل */}
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

        {showResults && (
          <div className="space-y-6">
            <SatelliteView coordinates={coordinates!} />
            <NearbyPlaces
              categories={nearbyData} isLoading={nearbyLoading}
              provider={nearbyProvider} isProviderLoading={isNearbyProviderLoading}
              providerError={nearbyProviderError} onProviderChange={handleNearbyProviderChange}
            />
            <TransportInfo estimate={priceEstimate} />
            <PriceEstimate estimate={priceEstimate} isLoading={isLoading}
              detectedDistrict={detectedDistrict} nearbyCategories={nearbyData} nearbyLoading={nearbyLoading} />

            {/* ── مخطط اتجاه الأسعار ── */}
            {priceEstimate && !isLoading && detectedCity && (
              <PriceTrend
                city={detectedCity}
                dealType="بيع"
                currentPrice={priceEstimate.pricePerSqmSale}
              />
            )}

            {/* ── حاسبة الاستثمار والرهن ── */}
            {priceEstimate && !isLoading && (
              <InvestmentCalc
                pricePerSqm={priceEstimate.pricePerSqmSale}
                area={searchParams?.area}
              />
            )}

            {/* ── الصفقات المرجعية ── */}
            {priceEstimate && !isLoading && refTransactions.length > 0 && (
              <RefTransactions transactions={refTransactions} />
            )}

            {/* ── وضع المقارنة ── */}
            {priceEstimate && !isLoading && (
              <div>
                {!compareMode ? (
                  <button
                    onClick={() => setCompareMode(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    {lang === "en" ? "+ Compare with another location" : "+ قارن مع موقع آخر"}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700 text-sm">
                        {lang === "en" ? "Second Location" : "الموقع الثاني للمقارنة"}
                      </h3>
                      <button onClick={() => { setCompareMode(false); setCompareEstimate(null); }}
                        className="text-xs text-gray-400 hover:text-red-500">
                        {lang === "en" ? "Cancel" : "إلغاء"}
                      </button>
                    </div>
                    <LocationInput onSearch={handleCompareSearch} isLoading={compareLoading} />
                    {compareError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm text-center">{compareError}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── نتيجة المقارنة ── */}
            {showCompare && compareEstimate && coordinates && compareCoords && (
              <CompareView
                primaryCoords={coordinates} primaryEstimate={priceEstimate!}
                primaryLabel={detectedDistrict ?? (lang === "en" ? "Location A" : "الموقع الأول")}
                compareCoords={compareCoords} compareEstimate={compareEstimate}
                compareLabel={compareDistrict ?? (lang === "en" ? "Location B" : "الموقع الثاني")}
              />
            )}

            {/* ── تصدير PDF ── */}
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
