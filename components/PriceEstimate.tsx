"use client";

import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

interface PriceEstimateProps {
  estimate: PriceEstimateType | null;
  isLoading: boolean;
  detectedDistrict?: string | null;
}

function formatNumber(num: number): string {
  return num.toLocaleString("ar-SA");
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-blue-600";
  if (score >= 4) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-green-50 border-green-200";
  if (score >= 6) return "bg-blue-50 border-blue-200";
  if (score >= 4) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-green-500" :
    value >= 60 ? "bg-blue-500" :
    value >= 40 ? "bg-amber-500" :
    "bg-red-400";

  const label =
    value >= 80 ? "عالية" :
    value >= 60 ? "متوسطة" :
    value >= 40 ? "منخفضة" :
    "ضعيفة";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-12 text-left">
        {value}% <span className="text-gray-400">({label})</span>
      </span>
    </div>
  );
}

export default function PriceEstimate({ estimate, isLoading, detectedDistrict }: PriceEstimateProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">تقديرات أسعار العقارات</h2>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  const isReal = estimate.dataSource === "real";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">تقديرات أسعار العقارات</h2>
          {isReal ? (
            <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              بيانات حقيقية ({estimate.transactionCount} صفقة)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block" />
              تقدير إحصائي
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {estimate.cityName}
          {detectedDistrict && (
            <span className="mx-1">
              — <span className="text-blue-600 font-medium">{detectedDistrict}</span>
            </span>
          )}
          {" — "}{estimate.areaClassification}
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Location Score */}
        <div className={`${getScoreBg(estimate.locationScore)} border rounded-xl p-4 flex items-center justify-between`}>
          <div>
            <p className="text-sm font-medium text-gray-700">مؤشر جودة الموقع</p>
            <p className="text-xs text-gray-500 mt-0.5">
              بناءً على الموقع داخل المدينة
              {estimate.metroBonus && estimate.metroBonus > 0 && (
                <span className="mr-1 text-blue-600 font-medium">
                  + قرب المترو (+{estimate.metroBonus})
                </span>
              )}
            </p>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(estimate.locationScore)}`}>
            {estimate.locationScore}
            <span className="text-sm font-normal text-gray-400">/10</span>
          </div>
        </div>

        {/* Confidence meter — يظهر فقط عند وجود بيانات حقيقية */}
        {isReal && estimate.confidence != null && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">مستوى الثقة بالتقدير</p>
              {estimate.nearbyCount != null && estimate.nearbyCount > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {estimate.nearbyCount} صفقة قريبة (≤20 كم)
                </span>
              )}
            </div>
            <ConfidenceBar value={estimate.confidence} />
            <p className="text-xs text-gray-400 mt-2">
              {estimate.confidence >= 80
                ? "بيانات وفيرة وقريبة — التقدير دقيق جداً"
                : estimate.confidence >= 60
                ? "بيانات كافية — التقدير موثوق"
                : estimate.confidence >= 40
                ? "بيانات محدودة — أضف صفقات قريبة لتحسين الدقة"
                : "بيانات قليلة — التقدير تقريبي، يُوصى بإضافة بيانات"}
            </p>
          </div>
        )}

        {/* Price Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-bl from-blue-50 to-white border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">سعر المتر المربع (بيع)</p>
            <p className="text-2xl font-bold text-blue-700">{formatNumber(estimate.pricePerSqmSale)}</p>
            <p className="text-xs text-gray-400 mt-1">ريال سعودي / م²</p>
          </div>

          <div className="bg-gradient-to-bl from-green-50 to-white border border-green-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">الإيجار الشهري التقديري</p>
            <p className="text-2xl font-bold text-green-700">{formatNumber(estimate.monthlyRent)}</p>
            <p className="text-xs text-gray-400 mt-1">ريال سعودي / شهر</p>
          </div>

          <div className="md:col-span-2 bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-3">نطاق سعر المتر في المنطقة</p>
            <div className="flex items-center gap-4">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 mb-1">الحد الأدنى</p>
                <p className="text-lg font-semibold text-gray-700">{formatNumber(estimate.priceRangeMin)}</p>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-l from-blue-500 via-blue-300 to-blue-100 rounded-full" />
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 mb-1">الحد الأعلى</p>
                <p className="text-lg font-semibold text-gray-700">{formatNumber(estimate.priceRangeMax)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">ريال سعودي / م²</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={`rounded-xl px-4 py-3 ${isReal ? "bg-green-50 border border-green-100" : "bg-amber-50 border border-amber-100"}`}>
          <p className={`text-xs ${isReal ? "text-green-700" : "text-amber-700"}`}>
            {isReal
              ? `التقدير مبني على ${estimate.transactionCount} صفقة حقيقية في ${estimate.cityName} باستخدام خوارزمية KNN مرجّحة بالمسافة والنوع والمساحة. للتقييم الدقيق راجع مقيّماً معتمداً.`
              : "لم تُضَف بعد صفقات حقيقية لهذه المدينة. الأسعار تقديرية إحصائية. أضف صفقات من صفحة البيانات لتحسين الدقة."}
          </p>
        </div>
      </div>
    </div>
  );
}
