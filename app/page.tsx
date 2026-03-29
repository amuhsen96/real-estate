"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import LocationInput, { type SearchParams } from "@/components/LocationInput";
import SatelliteView from "@/components/SatelliteView";
import PriceEstimate from "@/components/PriceEstimate";
import TransportInfo from "@/components/TransportInfo";
import PropertyReport, { type ReportData } from "@/components/PropertyReport";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";
import type { PriceEstimate as PriceEstimateType } from "@/lib/priceSimulator";

// تُحمَّل على العميل فقط لأنها تستخدم html2canvas + jsPDF
const ExportPDFButtons = dynamic(
  () => import("@/components/ExportPDFButtons"),
  { ssr: false }
);

export default function Home() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimateType | null>(null);
  const [detectedDistrict, setDetectedDistrict] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const reportArRef = useRef<HTMLDivElement>(null);
  const reportEnRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (params: SearchParams) => {
    setCoordinates({ lat: params.lat, lng: params.lng });
    setSearchParams(params);
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
          district: params.district,
        }),
      });

      if (!priceRes.ok) {
        const data = await priceRes.json();
        setError(data.error || "حدث خطأ أثناء حساب الأسعار");
        return;
      }

      const { detectedDistrict: autoDistrict, ...estimate } = await priceRes.json();
      setPriceEstimate(estimate);
      setDetectedDistrict(params.district ?? params.placeName ?? autoDistrict ?? null);
    } catch {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setIsLoading(false);
    }
  };

  const reportData: ReportData | null =
    coordinates && priceEstimate
      ? {
          coords: coordinates,
          estimate: priceEstimate,
          district: detectedDistrict,
          propertyType: searchParams?.propertyType,
          area: searchParams?.area,
          generatedAt: new Date().toLocaleDateString("ar-SA"),
        }
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-end gap-2">
          <Link
            href="/analyze"
            className="text-xs bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 px-4 py-2 rounded-full shadow-sm transition-colors"
          >
            تحليل الأسعار ←
          </Link>
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

            {/* ── أزرار تصدير PDF ── */}
            {priceEstimate && !isLoading && reportData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">تصدير تقرير PDF</p>
                <p className="text-xs text-gray-400 mb-4">
                  يتضمن التقرير: تفاصيل العقار · الخريطة مع المترو والاستاد · تقديرات الأسعار
                </p>
                <ExportPDFButtons
                  reportData={reportData}
                  arRef={reportArRef}
                  enRef={reportEnRef}
                />
              </div>
            )}
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

      {/* ── التقارير المخفية للطباعة ── */}
      {reportData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            visibility: "hidden",
            pointerEvents: "none",
            zIndex: -1,
          }}
          aria-hidden="true"
        >
          <PropertyReport data={reportData} lang="ar" reportRef={reportArRef} />
          <PropertyReport data={reportData} lang="en" reportRef={reportEnRef} />
        </div>
      )}
    </div>
  );
}
