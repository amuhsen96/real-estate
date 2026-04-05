"use client";

import { useI18n, translations } from "@/lib/i18n";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

interface NearbyCategory {
  category: string;
  places: { distance: number | null }[];
}

interface PriceEstimateProps {
  estimate: PriceEstimateType | null;
  isLoading: boolean;
  detectedDistrict?: string | null;
  nearbyCategories?: NearbyCategory[];
  nearbyLoading?: boolean;
}

function formatNumber(num: number): string { return num.toLocaleString("en-US"); }

function getScoreColor(s: number) {
  return s >= 8 ? "text-green-600" : s >= 6 ? "text-blue-600" : s >= 4 ? "text-amber-600" : "text-red-600";
}
function getScoreBg(s: number) {
  return s >= 8 ? "bg-green-50 border-green-200" : s >= 6 ? "bg-blue-50 border-blue-200" : s >= 4 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
}

/** حساب نقاط الخدمات (0–4) من بيانات Overpass */
function calcServicesScore(categories: NearbyCategory[]): number {
  const activeCats = categories.filter(
    (c) => c.places.some((p) => p.distance != null && p.distance <= 2000)
  ).length;
  return activeCats >= 8 ? 4.0
    : activeCats >= 6 ? 3.2
    : activeCats >= 4 ? 2.5
    : activeCats >= 2 ? 1.5
    : activeCats >= 1 ? 0.8
    : 0;
}

function classifyArea(score: number): string {
  if (score >= 8) return "منطقة راقية";
  if (score >= 6) return "منطقة جيدة";
  if (score >= 4) return "منطقة متوسطة";
  return "منطقة نائية";
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-12 text-left shrink-0">
        {value.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-blue-500" : value >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-10 text-left">{value}%</span>
    </div>
  );
}

export default function PriceEstimate({
  estimate, isLoading, detectedDistrict, nearbyCategories, nearbyLoading,
}: PriceEstimateProps) {
  const { t, lang } = useI18n();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t("priceTitle")}</h2>
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  if (!estimate) return null;
  const isReal = estimate.dataSource === "real";

  // حساب نقاط الخدمات وإضافتها للنتيجة الأساسية
  const servicesScore = nearbyCategories ? calcServicesScore(nearbyCategories) : 0;
  const finalScore    = Math.round(Math.min(10, estimate.locationScore + servicesScore) * 10) / 10;
  const finalClass    = nearbyCategories ? classifyArea(finalScore) : estimate.areaClassification;

  const bd = estimate.scoreBreakdown;

  // ترجمة تصنيف المنطقة
  const areaClassEn = (translations.areaClass.en as Record<string, string>)[finalClass] ?? finalClass;
  const areaClassDisplay = lang === "ar" ? finalClass : areaClassEn;

  const confidenceLabel = (v: number) =>
    v >= 80 ? t("confidenceHigh") : v >= 60 ? t("confidenceMed") : v >= 40 ? t("confidenceLow") : t("confidenceWeak");

  const scoreRows = [
    {
      label: lang === "en" ? "Services & Facilities (2 km)" : "الخدمات والمرافق (2 كم)",
      value: nearbyLoading ? null : servicesScore,
      max: 4,
      color: "bg-purple-500",
    },
    {
      label: lang === "en" ? "Metro Station" : "محطة المترو",
      value: bd.metro,
      max: 3,
      color: "bg-blue-500",
    },
    {
      label: lang === "en" ? "Geographic Location" : "الموقع الجغرافي",
      value: bd.geography,
      max: 2,
      color: "bg-teal-500",
    },
    {
      label: lang === "en" ? "Real Estate Market" : "السوق العقاري",
      value: bd.market,
      max: 1,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{t("priceTitle")}</h2>
          {isReal ? (
            <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              {t("realData")} ({estimate.transactionCount} {t("txCount")})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block" />
              {t("simulation")}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {estimate.cityName}
          {detectedDistrict && <span className="mx-1">— <span className="text-blue-600 font-medium">{detectedDistrict}</span></span>}
          {" — "}{areaClassDisplay}
        </p>
      </div>

      <div className="p-6 space-y-5">

        {/* مؤشر جودة الموقع */}
        <div className={`${getScoreBg(finalScore)} border rounded-xl p-4`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{t("locScore")}</p>
            <div className={`text-3xl font-bold ${getScoreColor(finalScore)}`}>
              {nearbyLoading
                ? <span className="text-2xl text-gray-400">{estimate.locationScore}<span className="text-sm font-normal text-gray-300">+…/10</span></span>
                : <>{finalScore}<span className="text-sm font-normal text-gray-400">/10</span></>
              }
            </div>
          </div>

          {/* تفاصيل المكونات */}
          <div className="space-y-2">
            {scoreRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] gap-x-3 items-center">
                <span className="text-xs text-gray-500 truncate">{row.label}</span>
                {row.value === null ? (
                  <span className="text-xs text-gray-400 w-24 text-left">{lang === "en" ? "loading…" : "جاري التحميل"}</span>
                ) : (
                  <div className="w-24">
                    <ScoreBar value={row.value} max={row.max} color={row.color} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {isReal && estimate.confidence != null && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">{t("confidenceTitle")}</p>
              {estimate.nearbyCount != null && estimate.nearbyCount > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {estimate.nearbyCount} {t("nearbyTx")}
                </span>
              )}
            </div>
            <ConfidenceBar value={estimate.confidence} />
            <p className="text-xs text-gray-400 mt-2">{confidenceLabel(estimate.confidence)}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-bl from-blue-50 to-white border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">{t("priceSaleSqm")}</p>
            <p className="text-2xl font-bold text-blue-700">{formatNumber(estimate.pricePerSqmSale)}</p>
            <p className="text-xs text-gray-400 mt-1">{t("sarSqm")}</p>
          </div>
          <div className="bg-gradient-to-bl from-green-50 to-white border border-green-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">{t("monthlyRent")}</p>
            <p className="text-2xl font-bold text-green-700">{formatNumber(estimate.monthlyRent)}</p>
            <p className="text-xs text-gray-400 mt-1">{t("sarMonth")}</p>
          </div>
          <div className="md:col-span-2 bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-3">{t("priceRange")}</p>
            <div className="flex items-center gap-4">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 mb-1">{t("priceMin")}</p>
                <p className="text-lg font-semibold text-gray-700">{formatNumber(estimate.priceRangeMin)}</p>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-l from-blue-500 via-blue-300 to-blue-100 rounded-full" />
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 mb-1">{t("priceMax")}</p>
                <p className="text-lg font-semibold text-gray-700">{formatNumber(estimate.priceRangeMax)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">{t("sarUnit")}</p>
          </div>
        </div>

        <div className={`rounded-xl px-4 py-3 ${isReal ? "bg-green-50 border border-green-100" : "bg-amber-50 border border-amber-100"}`}>
          <p className={`text-xs ${isReal ? "text-green-700" : "text-amber-700"}`}>
            {isReal ? t("disclaimerReal") : t("disclaimerSim")}
          </p>
        </div>
      </div>
    </div>
  );
}
