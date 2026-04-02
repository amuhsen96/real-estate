"use client";

import type { PriceEstimate } from "@/lib/priceSimulator";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";

export interface ReportData {
  coords: Coordinates;
  estimate: PriceEstimate;
  district?: string | null;
  propertyType?: string;
  area?: number;
  generatedAt?: string;
}

interface Props {
  data: ReportData;
  lang: "ar" | "en";
  reportRef: React.RefObject<HTMLDivElement | null>;
}

function fmt(n: number) { return n.toLocaleString("en-US"); }

const LABEL = {
  ar: {
    title: "تقرير تحليل موقع العقار",
    subtitle: "تقدير مبني على بيانات السوق الفعلية",
    date: "تاريخ التقرير",
    coords: "الإحداثيات",
    city: "المدينة",
    district: "الحي",
    propType: "نوع العقار",
    area: "المساحة",
    sqm: "م²",
    mapTitle: "خريطة الموقع",
    mapLegend: "الموقع • م = محطة المترو • ا = الاستاد",
    priceTitle: "تقديرات الأسعار",
    priceSqm: "سعر المتر (بيع)",
    rent: "الإيجار الشهري",
    rangeMin: "الحد الأدنى",
    rangeMax: "الحد الأعلى",
    sar: "ر.س",
    sarSqm: "ر.س / م²",
    locationScore: "مؤشر جودة الموقع",
    areaClass: "تصنيف المنطقة",
    confidence: "مستوى الثقة",
    txCount: "صفقات مرجعية",
    nearbyCount: "صفقات قريبة",
    metroTitle: "أقرب محطة مترو",
    stadiumTitle: "أقرب استاد",
    line: "الخط",
    distance: "المسافة",
    teams: "الفرق",
    dataSource: "مصدر البيانات",
    real: "بيانات حقيقية",
    simulated: "تقدير إحصائي",
    disclaimer:
      "التقديرات مبنية على بيانات السوق المتاحة وخوارزمية KNN. للتقييم الدقيق يُوصى بمراجعة مقيّم عقاري معتمد.",
    noMetro: "لا تتوفر بيانات محطة مترو",
    noStadium: "لا تتوفر بيانات استاد",
  },
  en: {
    title: "Property Location Analysis Report",
    subtitle: "Estimate based on actual market data",
    date: "Report Date",
    coords: "Coordinates",
    city: "City",
    district: "District",
    propType: "Property Type",
    area: "Area",
    sqm: "m²",
    mapTitle: "Location Map",
    mapLegend: "P = Property  •  M = Metro Station  •  S = Stadium",
    priceTitle: "Price Estimates",
    priceSqm: "Price per sqm (Sale)",
    rent: "Monthly Rent",
    rangeMin: "Min",
    rangeMax: "Max",
    sar: "SAR",
    sarSqm: "SAR / m²",
    locationScore: "Location Quality Score",
    areaClass: "Area Classification",
    confidence: "Confidence Level",
    txCount: "Reference Transactions",
    nearbyCount: "Nearby Transactions",
    metroTitle: "Nearest Metro Station",
    stadiumTitle: "Nearest Stadium",
    line: "Line",
    distance: "Distance",
    teams: "Teams",
    dataSource: "Data Source",
    real: "Real Data",
    simulated: "Statistical Estimate",
    disclaimer:
      "Estimates are based on available market data and KNN algorithm. For accurate valuation, consult a certified appraiser.",
    noMetro: "No metro station data available",
    noStadium: "No stadium data available",
  },
} as const;

export default function PropertyReport({ data, lang, reportRef }: Props) {
  const L = LABEL[lang];
  const { coords, estimate, district, propertyType, area, generatedAt } = data;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isReal = estimate.dataSource === "real";

  const mapSrc = buildMapSrc(coords, estimate);
  const dateStr = generatedAt ?? new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US");

  const scoreColor =
    estimate.locationScore >= 8 ? "#16a34a" :
    estimate.locationScore >= 6 ? "#2563eb" :
    estimate.locationScore >= 4 ? "#d97706" :
    "#dc2626";

  return (
    <div
      ref={reportRef}
      dir={dir}
      style={{
        width: "794px",           // A4 at 96dpi
        minHeight: "1123px",
        background: "white",
        fontFamily: lang === "ar"
          ? "'Segoe UI', 'Arial Unicode MS', Arial, sans-serif"
          : "Arial, sans-serif",
        fontSize: "13px",
        color: "#1e293b",
        padding: "48px",
        boxSizing: "border-box",
        lineHeight: "1.6",
      }}
    >
      {/* ── رأس الصفحة ── */}
      <div style={{ borderBottom: "3px solid #1e40af", paddingBottom: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>
              {L.title}
            </h1>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{L.subtitle}</p>
          </div>
          <div style={{ textAlign: lang === "ar" ? "left" : "right", fontSize: "11px", color: "#64748b" }}>
            <div>{L.date}: {dateStr}</div>
            <div dir="ltr">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</div>
          </div>
        </div>
      </div>

      {/* ── معلومات العقار ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: "12px", marginBottom: "24px",
        background: "#f8fafc", borderRadius: "10px", padding: "16px",
      }}>
        {[
          [L.city, estimate.cityName],
          [L.district, district ?? "—"],
          [L.propType, propertyType ?? "—"],
          [L.area, area ? `${fmt(area)} ${L.sqm}` : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>{label}</div>
            <div style={{ fontWeight: "600", color: "#0f172a" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── الخريطة ── */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#1e293b", marginBottom: "10px" }}>
          {L.mapTitle}
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mapSrc}
          alt="map"
          style={{
            width: "100%", height: "280px", objectFit: "cover",
            borderRadius: "10px", border: "1px solid #e2e8f0", display: "block",
          }}
          crossOrigin="anonymous"
        />
        <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
            {lang === "ar" ? "الموقع" : "Property"}
          </span>
          {estimate.nearestMetro && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
              {lang === "ar" ? "محطة المترو" : "Metro Station"}
            </span>
          )}
          {estimate.nearestStadium && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              {lang === "ar" ? "الاستاد" : "Stadium"}
            </span>
          )}
        </div>
      </div>

      {/* ── الأسعار + الموقع ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>

        {/* الأسعار */}
        <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "16px", border: "1px solid #bfdbfe" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e40af", margin: "0 0 12px" }}>
            {L.priceTitle}
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {[
                [L.priceSqm, `${fmt(estimate.pricePerSqmSale)} ${L.sarSqm}`],
                [L.rent, `${fmt(estimate.monthlyRent)} ${L.sar}`],
                [L.rangeMin, `${fmt(estimate.priceRangeMin)} ${L.sarSqm}`],
                [L.rangeMax, `${fmt(estimate.priceRangeMax)} ${L.sarSqm}`],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #dbeafe" }}>
                  <td style={{ padding: "5px 2px", color: "#475569" }}>{k}</td>
                  <td style={{ padding: "5px 2px", fontWeight: "700", color: "#1e40af", textAlign: lang === "ar" ? "left" : "right" }} dir="ltr">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* جودة الموقع */}
        <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "16px", border: "1px solid #bbf7d0" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#15803d", margin: "0 0 12px" }}>
            {L.locationScore}
          </h2>
          <div style={{ textAlign: "center", margin: "8px 0" }}>
            <span style={{ fontSize: "42px", fontWeight: "900", color: scoreColor }}>
              {estimate.locationScore}
            </span>
            <span style={{ fontSize: "16px", color: "#94a3b8" }}>/10</span>
          </div>
          <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", color: scoreColor, marginBottom: "12px" }}>
            {estimate.areaClassification}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              {[
                [L.dataSource, isReal ? L.real : L.simulated],
                ...(isReal ? [
                  [L.confidence, `${estimate.confidence ?? 0}%`],
                  [L.txCount, fmt(estimate.transactionCount ?? 0)],
                  ...(estimate.nearbyCount ? [[L.nearbyCount, fmt(estimate.nearbyCount)]] : []),
                ] : []),
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #dcfce7" }}>
                  <td style={{ padding: "4px 2px", color: "#475569" }}>{k}</td>
                  <td style={{ padding: "4px 2px", fontWeight: "600", color: "#15803d", textAlign: lang === "ar" ? "left" : "right" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── المرافق القريبة ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>

        {/* المترو */}
        <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "16px", border: "1px solid #bfdbfe" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: estimate.nearestMetro?.lineColor ?? "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "bold" }}>م</span>
            {L.metroTitle}
          </h2>
          {estimate.nearestMetro ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                {[
                  [lang === "ar" ? "الاسم" : "Name", estimate.nearestMetro.nameAr],
                  [L.line, estimate.nearestMetro.lineNameAr],
                  [L.distance, `${estimate.nearestMetro.distKm < 1 ? `${Math.round(estimate.nearestMetro.distKm * 1000)} م` : `${estimate.nearestMetro.distKm.toFixed(1)} كم`}`],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: "1px solid #dbeafe" }}>
                    <td style={{ padding: "4px 2px", color: "#475569" }}>{k}</td>
                    <td style={{ padding: "4px 2px", fontWeight: "600", color: "#1e40af", textAlign: lang === "ar" ? "left" : "right" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>{L.noMetro}</p>
          )}
        </div>

        {/* الاستاد */}
        <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "16px", border: "1px solid #bbf7d0" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "bold", color: "#15803d", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px" }}>🏟</span>
            {L.stadiumTitle}
          </h2>
          {estimate.nearestStadium ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                {[
                  [lang === "ar" ? "الاسم" : "Name", estimate.nearestStadium.nameAr],
                  [L.distance, `${estimate.nearestStadium.distKm < 1 ? `${Math.round(estimate.nearestStadium.distKm * 1000)} م` : `${estimate.nearestStadium.distKm.toFixed(1)} كم`}`],
                  ...(estimate.nearestStadium.teams.length > 0
                    ? [[L.teams, estimate.nearestStadium.teams.slice(0, 2).join(" · ")]]
                    : []),
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: "1px solid #dcfce7" }}>
                    <td style={{ padding: "4px 2px", color: "#475569" }}>{k}</td>
                    <td style={{ padding: "4px 2px", fontWeight: "600", color: "#15803d", textAlign: lang === "ar" ? "left" : "right" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>{L.noStadium}</p>
          )}
        </div>
      </div>

      {/* ── تذييل ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", fontSize: "10px", color: "#94a3b8" }}>
        {L.disclaimer}
      </div>
    </div>
  );
}

/** بناء رابط صورة الخريطة */
export function buildMapSrc(coords: Coordinates, estimate: PriceEstimate): string {
  const p = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng) });
  if (estimate.nearestMetro) {
    // استخراج الإحداثيات من رابط Google Maps المحفوظ في routeUrl
    const match = estimate.nearestMetro.routeUrl.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (match) { p.set("mlat", match[1]); p.set("mlng", match[2]); }
  }
  if (estimate.nearestStadium) {
    const match = estimate.nearestStadium.routeUrl.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (match) { p.set("slat", match[1]); p.set("slng", match[2]); }
  }
  return `/api/map-image?${p}`;
}
