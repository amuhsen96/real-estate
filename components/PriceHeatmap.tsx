"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

interface DistrictPoint {
  district: string;
  cnt: number;
  avg_sqm: number;
  lat?: number;
  lng?: number;
}

interface Props {
  city: string;
  dealType?: string;
  alwaysOpen?: boolean;
}

const LEAFLET_CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";

function loadLeaflet(): Promise<typeof import("leaflet")> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_CDN}"]`);
    if (existing) { existing.addEventListener("load", () => resolve(w.L)); existing.addEventListener("error", reject); return; }
    const script = document.createElement("script");
    script.src = LEAFLET_CDN; script.async = true;
    script.onload = () => resolve(w.L); script.onerror = reject;
    document.head.appendChild(script);
  });
}

function priceColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  if (t < 0.5) return `rgb(${Math.round(t * 2 * 220)},200,50)`;
  return `rgb(220,${Math.round((1 - (t - 0.5) * 2) * 180)},30)`;
}

function circleRadius(cnt: number, maxCnt: number): number {
  return 400 + Math.min(1, cnt / maxCnt) * 900;
}

// مقياس لوني للجدول
function tableBadgeStyle(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  if (t < 0.33) return "bg-green-100 text-green-800";
  if (t < 0.66) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function PriceHeatmap({ city, dealType = "بيع", alwaysOpen = false }: Props) {
  const { lang } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [geocoded, setGeocoded] = useState<DistrictPoint[]>([]);
  const [allDistricts, setAllDistricts] = useState<DistrictPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"map" | "table">("table");

  const isVisible = alwaysOpen || open;

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setError(false);
    setGeocoded([]); setAllDistricts([]);
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const p = new URLSearchParams({ city, dealType });
    fetch(`/api/heatmap?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.all) setAllDistricts(d.all);
        if (d.data && d.data.length > 0) { setGeocoded(d.data); setTab("map"); }
        else setTab("table");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [city, dealType]);

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current || geocoded.length === 0) return;
    const L = await loadLeaflet();
    if (!mapRef.current) return;
    const avgLat = geocoded.reduce((s, d) => s + (d.lat ?? 0), 0) / geocoded.length;
    const avgLng = geocoded.reduce((s, d) => s + (d.lng ?? 0), 0) / geocoded.length;
    const map = L.map(mapRef.current).setView([avgLat, avgLng], 11);
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(map);
    const prices = geocoded.map((d) => d.avg_sqm);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const maxCnt = Math.max(...geocoded.map((d) => d.cnt));
    geocoded.forEach((point) => {
      const color = priceColor(point.avg_sqm, minP, maxP);
      L.circle([point.lat!, point.lng!], { radius: circleRadius(point.cnt, maxCnt), color, fillColor: color, fillOpacity: 0.45, weight: 1.5 })
        .addTo(map)
        .bindPopup(`<div style="font-family:Arial;min-width:160px;direction:rtl"><b style="font-size:13px">${point.district}</b><br><span style="color:#2563eb;font-weight:bold">${Math.round(point.avg_sqm).toLocaleString("en-US")} ${lang === "en" ? "SAR/m²" : "ر.س/م²"}</span><br><span style="color:#6b7280;font-size:11px">${point.cnt} ${lang === "en" ? "transactions" : "صفقة"}</span></div>`);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legend = (L as any).control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "");
      div.style.cssText = "background:white;padding:8px 10px;border-radius:8px;font-size:11px;line-height:1.8;box-shadow:0 2px 8px rgba(0,0,0,.15);direction:rtl";
      div.innerHTML = `<b style="display:block;margin-bottom:2px">${lang === "en" ? "SAR/m²" : "ر.س/م²"}</b><span style="color:rgb(0,200,50)">●</span> ${lang === "en" ? "Low" : "منخفض"}<br><span style="color:rgb(220,160,30)">●</span> ${lang === "en" ? "Mid" : "متوسط"}<br><span style="color:rgb(220,30,30)">●</span> ${lang === "en" ? "High" : "مرتفع"}`;
      return div;
    };
    legend.addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocoded, lang]);

  useEffect(() => {
    if (isVisible && tab === "map" && geocoded.length > 0) setTimeout(() => initMap(), 80);
    return () => { if (!isVisible && mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [isVisible, tab, geocoded, initMap]);

  // ── جدول الأسعار ──────────────────────────────────────────────────────────
  const tableData = allDistricts.length > 0 ? allDistricts : geocoded;
  const prices = tableData.map((d) => d.avg_sqm);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;

  const PriceTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500">{lang === "en" ? "District" : "الحي"}</th>
            <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500">{lang === "en" ? "SAR/m²" : "ر.س/م²"}</th>
            <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500">{lang === "en" ? "Transactions" : "الصفقات"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tableData.map((row) => (
            <tr key={row.district} className="hover:bg-gray-50">
              <td className="py-2.5 px-4 text-gray-700 font-medium">{row.district}</td>
              <td className="py-2.5 px-4 text-center">
                <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${tableBadgeStyle(row.avg_sqm, minP, maxP)}`}>
                  {Math.round(row.avg_sqm).toLocaleString("en-US")}
                </span>
              </td>
              <td className="py-2.5 px-4 text-center text-gray-400 text-xs">{row.cnt.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── محتوى مشترك ───────────────────────────────────────────────────────────
  const body = (
    <>
      {loading ? (
        <div className="h-52 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-400">{lang === "en" ? "Loading data…" : "جاري تحميل البيانات..."}</p>
          {tab === "map" && <p className="text-xs text-gray-300">{lang === "en" ? "Geocoding districts (may take ~30s)" : "يتم تحديد إحداثيات الأحياء (~30 ث)"}</p>}
        </div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">
          {lang === "en" ? "Could not load data" : "تعذّر تحميل البيانات"}
        </div>
      ) : tableData.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">
          {lang === "en" ? "No data found for this city" : "لا توجد بيانات لهذه المدينة"}
        </div>
      ) : (
        <>
          {/* Tab switcher — only show map tab if geocoding succeeded */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mx-4 mt-4 w-fit">
            <button onClick={() => setTab("table")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "table" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {lang === "en" ? "📋 Table" : "📋 جدول"}
            </button>
            {geocoded.length > 0 && (
              <button onClick={() => setTab("map")}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "map" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {lang === "en" ? "🗺️ Map" : "🗺️ خريطة"}
              </button>
            )}
          </div>

          {tab === "table" ? (
            <div className="mt-3 pb-2"><PriceTable /></div>
          ) : (
            <>
              <div ref={mapRef} style={{ height: alwaysOpen ? "500px" : "400px", width: "100%", marginTop: "12px" }} />
            </>
          )}

          <div className="px-4 py-3 border-t border-gray-100 mt-1">
            <p className="text-xs text-gray-400">
              {tableData.length} {lang === "en" ? "districts" : "حي"} ·{" "}
              {geocoded.length > 0
                ? `${geocoded.length} ${lang === "en" ? "geocoded" : "تم تحديد موقعها على الخريطة"}`
                : lang === "en" ? "Map unavailable (district names not found in OpenStreetMap)" : "الخريطة غير متاحة — أسماء الأحياء غير موجودة في OpenStreetMap"}
            </p>
          </div>
        </>
      )}
    </>
  );

  if (alwaysOpen) {
    return <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">{body}</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div className="text-right">
            <span className="font-bold text-gray-800">{lang === "en" ? "Price Map by District" : "خريطة أسعار الأحياء"}</span>
            <p className="text-xs text-gray-400 mt-0.5">{lang === "en" ? `City: ${city}` : `المدينة: ${city}`}</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && body}
    </div>
  );
}
