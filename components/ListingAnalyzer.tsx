"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { SearchParams } from "@/components/LocationInput";
import type { PriceEstimate } from "@/lib/priceSimulator";

interface ListingData {
  title: string | null;
  price: number | null;
  area: number | null;
  lat: number | null;
  lng: number | null;
  propertyType: string | null;
  source: "aqar" | "bayut" | "unknown";
}

interface Props {
  onAnalyzeLocation: (params: SearchParams) => void;
  currentEstimate?: PriceEstimate;
}

function priceDiff(listing: ListingData, estimate: PriceEstimate): { pct: number; label: string; color: string } | null {
  if (!listing.price || !listing.area || listing.area <= 0) return null;
  const listingPricePerSqm = listing.price / listing.area;
  const ourPrice = estimate.pricePerSqmSale;
  if (!ourPrice) return null;
  const pct = Math.round(((listingPricePerSqm - ourPrice) / ourPrice) * 100);
  if (pct > 10) return { pct, label: "غالٍ", color: "text-red-600 bg-red-50 border-red-200" };
  if (pct < -10) return { pct, label: "أرخص من السوق", color: "text-green-600 bg-green-50 border-green-200" };
  return { pct, label: "مناسب", color: "text-amber-600 bg-amber-50 border-amber-200" };
}

export default function ListingAnalyzer({ onAnalyzeLocation, currentEstimate }: Props) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [listing, setListing] = useState<ListingData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    setListing(null);
    try {
      const res = await fetch("/api/parse-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json();
      if (d.error) { setErrorMsg(d.error); setStatus("error"); return; }
      setListing(d);
      setStatus("done");
    } catch {
      setErrorMsg(lang === "en" ? "Connection error" : "تعذّر الاتصال");
      setStatus("error");
    }
  };

  const diff = listing && currentEstimate ? priceDiff(listing, currentEstimate) : null;

  const L = {
    title: lang === "en" ? "Analyze Aqar / Bayut Listing" : "حلّل إعلاناً من Aqar / Bayut",
    subtitle: lang === "en" ? "Paste a listing URL to compare with our estimate" : "الصق رابط إعلان لمقارنته بتقديرنا",
    placeholder: lang === "en" ? "https://sa.aqar.fm/... or https://www.bayut.com/..." : "https://sa.aqar.fm/... أو https://www.bayut.com/...",
    analyze: lang === "en" ? "Analyze" : "حلّل",
    analyzing: lang === "en" ? "Analyzing…" : "جاري التحليل...",
    analyzeLocation: lang === "en" ? "Analyze This Location" : "حلّل هذا الموقع",
    listingPrice: lang === "en" ? "Listing Price" : "سعر الإعلان",
    ourEstimate: lang === "en" ? "Our Estimate" : "تقديرنا",
    pricePerSqm: lang === "en" ? "SAR/m²" : "ر.س/م²",
    total: lang === "en" ? "Total" : "الإجمالي",
    sar: lang === "en" ? "SAR" : "ر.س",
    area: lang === "en" ? "Area" : "المساحة",
    noCoords: lang === "en" ? "No location found in listing — can't analyze location" : "لم يُعثر على موقع في الإعلان",
    overvalued: lang === "en" ? "Overpriced" : "غالٍ",
    fair: lang === "en" ? "Fair Price" : "مناسب",
    undervalued: lang === "en" ? "Below Market" : "أرخص من السوق",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div className="text-right">
            <span className="font-bold text-gray-800">{L.title}</span>
            <p className="text-xs text-gray-400 mt-0.5">{L.subtitle}</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4">
          {/* Input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder={L.placeholder}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-right"
            />
            <button
              onClick={handleAnalyze}
              disabled={status === "loading" || !url.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {status === "loading" ? L.analyzing : L.analyze}
            </button>
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Results */}
          {status === "done" && listing && (
            <div className="space-y-4">
              {/* Title */}
              {listing.title && (
                <p className="text-sm font-medium text-gray-700 line-clamp-2">{listing.title}</p>
              )}

              {/* Price comparison grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Listing price per sqm */}
                {listing.price && listing.area && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{L.listingPrice}</p>
                    <p className="text-lg font-bold text-gray-800">
                      {Math.round(listing.price / listing.area).toLocaleString("en-US")}
                    </p>
                    <p className="text-xs text-gray-500">{L.pricePerSqm}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {L.total}: {listing.price.toLocaleString("en-US")} {L.sar}
                    </p>
                  </div>
                )}

                {/* Our estimate */}
                {currentEstimate && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs text-blue-400 mb-1">{L.ourEstimate}</p>
                    <p className="text-lg font-bold text-blue-700">
                      {currentEstimate.pricePerSqmSale.toLocaleString("en-US")}
                    </p>
                    <p className="text-xs text-blue-500">{L.pricePerSqm}</p>
                    {listing.area && (
                      <p className="text-xs text-blue-400 mt-1">
                        {L.total}: {Math.round(currentEstimate.pricePerSqmSale * listing.area).toLocaleString("en-US")} {L.sar}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Area */}
              {listing.area && (
                <p className="text-xs text-gray-500">{L.area}: {listing.area} م²</p>
              )}

              {/* Valuation badge */}
              {diff && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${diff.color}`}>
                  <span>{diff.pct > 0 ? "▲" : "▼"} {Math.abs(diff.pct)}%</span>
                  <span>{diff.label}</span>
                  <span className="text-xs opacity-70">
                    {lang === "en" ? "vs our estimate" : "مقارنةً بتقديرنا"}
                  </span>
                </div>
              )}

              {/* No current estimate — just show listing data */}
              {!currentEstimate && listing.price && listing.area && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">
                    {lang === "en" ? "Search a location first to compare prices." : "ابحث عن موقع أولاً لمقارنة الأسعار."}
                  </p>
                </div>
              )}

              {/* Analyze Location button */}
              {listing.lat && listing.lng ? (
                <button
                  onClick={() => onAnalyzeLocation({
                    lat: listing.lat!,
                    lng: listing.lng!,
                    propertyType: listing.propertyType ?? undefined,
                    area: listing.area ?? undefined,
                  })}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                  📍 {L.analyzeLocation}
                </button>
              ) : (
                <p className="text-xs text-gray-400 text-center">{L.noCoords}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
