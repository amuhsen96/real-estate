"use client";

import { useI18n, translations } from "@/lib/i18n";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

interface PriceEstimateProps {
  estimate: PriceEstimateType | null;
  isLoading: boolean;
  detectedDistrict?: string | null;
}

function formatNumber(num: number): string { return num.toLocaleString("en-US"); }
function getScoreColor(s: number) { return s >= 8 ? "text-green-600" : s >= 6 ? "text-blue-600" : s >= 4 ? "text-amber-600" : "text-red-600"; }
function getScoreBg(s: number) { return s >= 8 ? "bg-green-50 border-green-200" : s >= 6 ? "bg-blue-50 border-blue-200" : s >= 4 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"; }

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

export default function PriceEstimate({ estimate, isLoading, detectedDistrict }: PriceEstimateProps) {
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

  // ترجمة تصنيف المنطقة
  const areaClassEn = (translations.areaClass.en as Record<string, string>)[estimate.areaClassification] ?? estimate.areaClassification;
  const areaClassDisplay = lang === "ar" ? estimate.areaClassification : areaClassEn;

  const confidenceLabel = (v: number) =>
    v >= 80 ? t("confidenceHigh") : v >= 60 ? t("confidenceMed") : v >= 40 ? t("confidenceLow") : t("confidenceWeak");

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
        <div className={`${getScoreBg(estimate.locationScore)} border rounded-xl p-4 flex items-center justify-between`}>
          <div>
            <p className="text-sm font-medium text-gray-700">{t("locScore")}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("locScoreNote")}
              {estimate.metroBonus && estimate.metroBonus > 0 && (
                <span className="mx-1 text-blue-600 font-medium">{t("metroBonus")} (+{estimate.metroBonus})</span>
              )}
            </p>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(estimate.locationScore)}`}>
            {estimate.locationScore}<span className="text-sm font-normal text-gray-400">/10</span>
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
