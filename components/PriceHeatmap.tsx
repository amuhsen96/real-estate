"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

interface DistrictPoint {
  district: string;
  cnt: number;
  avg_sqm: number;
  lat: number;
  lng: number;
}

interface Props {
  city: string;
  dealType?: string;
  /** عرض الخريطة مباشرة بدون accordion */
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
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(w.L));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_CDN;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function priceColor(value: number, min: number, max: number): string {
  const range = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / range));
  if (t < 0.5) {
    const r = Math.round(t * 2 * 255);
    return `rgb(${r},200,50)`;
  } else {
    const g = Math.round((1 - (t - 0.5) * 2) * 200);
    return `rgb(230,${g},30)`;
  }
}

function circleRadius(cnt: number, maxCnt: number): number {
  const t = Math.min(1, cnt / maxCnt);
  return 400 + t * 900;
}

export default function PriceHeatmap({ city, dealType = "بيع", alwaysOpen = false }: Props) {
  const { lang } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [data, setData] = useState<DistrictPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const isVisible = alwaysOpen || open;

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setError(false);
    setData([]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    const p = new URLSearchParams({ city, dealType });
    fetch(`/api/heatmap?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.data && d.data.length > 0) setData(d.data); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [city, dealType]);

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current || data.length === 0) return;

    const L = await loadLeaflet();
    if (!mapRef.current) return;

    const avgLat = data.reduce((s, d) => s + d.lat, 0) / data.length;
    const avgLng = data.reduce((s, d) => s + d.lng, 0) / data.length;

    const map = L.map(mapRef.current).setView([avgLat, avgLng], 11);
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const prices = data.map((d) => d.avg_sqm);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const maxCnt = Math.max(...data.map((d) => d.cnt));

    data.forEach((point) => {
      const color = priceColor(point.avg_sqm, minPrice, maxPrice);
      const radius = circleRadius(point.cnt, maxCnt);
      L.circle([point.lat, point.lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.45,
        weight: 1.5,
      }).addTo(map).bindPopup(
        `<div style="font-family:Arial;min-width:160px;direction:rtl">
          <b style="font-size:13px">${point.district}</b><br>
          <span style="color:#2563eb;font-weight:bold">${Math.round(point.avg_sqm).toLocaleString("en-US")} ${lang === "en" ? "SAR/m²" : "ر.س/م²"}</span><br>
          <span style="color:#6b7280;font-size:11px">${point.cnt} ${lang === "en" ? "transactions" : "صفقة"}</span>
        </div>`
      );
    });

    // Legend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legend = (L as any).control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "");
      div.style.cssText =
        "background:white;padding:8px 10px;border-radius:8px;font-size:11px;line-height:1.6;box-shadow:0 2px 8px rgba(0,0,0,.15);direction:rtl";
      div.innerHTML = `
        <b style="display:block;margin-bottom:4px">${lang === "en" ? "Price / m²" : "السعر / م²"}</b>
        <span style="color:rgb(0,200,50)">●</span> ${lang === "en" ? "Low" : "منخفض"}<br>
        <span style="color:rgb(255,200,0)">●</span> ${lang === "en" ? "Mid" : "متوسط"}<br>
        <span style="color:rgb(230,30,30)">●</span> ${lang === "en" ? "High" : "مرتفع"}
      `;
      return div;
    };
    legend.addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lang]);

  useEffect(() => {
    if (isVisible && data.length > 0) {
      setTimeout(() => initMap(), 50);
    }
    return () => {
      if (!isVisible && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isVisible, data, initMap]);

  const mapContent = (
    <>
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-400">
            {lang === "en" ? "Loading district data & geocoding…" : "جاري تحميل بيانات الأحياء وتحديد المواقع..."}
          </p>
          <p className="text-xs text-gray-300">
            {lang === "en" ? "This may take 20–30 seconds" : "قد يستغرق 20-30 ثانية"}
          </p>
        </div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">
          {lang === "en" ? "Could not load heatmap data" : "تعذّر تحميل بيانات الخريطة"}
        </div>
      ) : data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">
          {lang === "en" ? "No district data available for this city" : "لا توجد بيانات أحياء كافية لهذه المدينة"}
        </div>
      ) : (
        <>
          <div ref={mapRef} style={{ height: alwaysOpen ? "500px" : "420px", width: "100%" }} />
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {data.length} {lang === "en" ? "districts" : "حي"} · {lang === "en" ? "Circle size = transaction volume" : "حجم الدائرة = حجم الصفقات"} · {lang === "en" ? "Click a circle for details" : "انقر على دائرة للتفاصيل"}
            </p>
          </div>
        </>
      )}
    </>
  );

  // وضع alwaysOpen: لا accordion، الخريطة مباشرة
  if (alwaysOpen) {
    return <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">{mapContent}</div>;
  }

  // وضع accordion (للصفحة الرئيسية)
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div className="text-right">
            <span className="font-bold text-gray-800">
              {lang === "en" ? "Price Heat Map by District" : "خريطة أسعار الأحياء"}
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === "en" ? `City: ${city}` : `المدينة: ${city}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && open && (
            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          )}
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div>{mapContent}</div>}
    </div>
  );
}
