"use client";

import { useI18n } from "@/lib/i18n";
import type { PriceEstimate } from "@/lib/priceSimulator";
import type { Coordinates } from "@/lib/parseGoogleMapsUrl";

interface Props {
  primaryCoords: Coordinates;
  primaryEstimate: PriceEstimate;
  primaryLabel?: string;
  compareCoords: Coordinates;
  compareEstimate: PriceEstimate;
  compareLabel?: string;
}

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`;
}

export default function CompareView({
  primaryEstimate, primaryLabel = "الموقع الأول",
  compareEstimate, compareLabel = "الموقع الثاني",
}: Props) {
  const { lang } = useI18n();

  const pE = primaryEstimate;
  const cE = compareEstimate;

  const L = {
    title:    lang === "en" ? "Location Comparison" : "مقارنة الموقعين",
    first:    lang === "en" ? "Location A" : primaryLabel,
    second:   lang === "en" ? "Location B" : compareLabel,
    price:    lang === "en" ? "Price / m²" : "السعر / م²",
    rent:     lang === "en" ? "Monthly Rent" : "الإيجار الشهري",
    score:    lang === "en" ? "Location Score" : "مؤشر الموقع",
    metro:    lang === "en" ? "Nearest Metro" : "أقرب مترو",
    source:   lang === "en" ? "Data Source" : "مصدر البيانات",
    winner:   lang === "en" ? "Better" : "أفضل",
    sar:      lang === "en" ? "SAR" : "ر.س",
    sarSqm:   lang === "en" ? "SAR/m²" : "ر.س/م²",
    noMetro:  lang === "en" ? "Not available" : "غير متوفر",
    real:     lang === "en" ? "Real Data" : "بيانات حقيقية",
    sim:      lang === "en" ? "Estimated" : "تقديرية",
  };

  type Row = {
    label: string;
    primary: string;
    compare: string;
    winner: "primary" | "compare" | "tie";
  };

  const rows: Row[] = [
    {
      label: L.price,
      primary: `${pE.pricePerSqmSale.toLocaleString("en-US")} ${L.sarSqm}`,
      compare: `${cE.pricePerSqmSale.toLocaleString("en-US")} ${L.sarSqm}`,
      winner: pE.pricePerSqmSale === cE.pricePerSqmSale ? "tie"
            : pE.pricePerSqmSale < cE.pricePerSqmSale ? "primary" : "compare",
    },
    {
      label: L.rent,
      primary: `${pE.monthlyRent.toLocaleString("en-US")} ${L.sar}`,
      compare: `${cE.monthlyRent.toLocaleString("en-US")} ${L.sar}`,
      winner: pE.monthlyRent === cE.monthlyRent ? "tie"
            : pE.monthlyRent > cE.monthlyRent ? "primary" : "compare",
    },
    {
      label: L.score,
      primary: `${pE.locationScore} / 10`,
      compare: `${cE.locationScore} / 10`,
      winner: pE.locationScore === cE.locationScore ? "tie"
            : pE.locationScore > cE.locationScore ? "primary" : "compare",
    },
    {
      label: L.metro,
      primary: pE.nearestMetro ? `${pE.nearestMetro.nameAr} (${formatDist(pE.nearestMetro.distKm)})` : L.noMetro,
      compare: cE.nearestMetro ? `${cE.nearestMetro.nameAr} (${formatDist(cE.nearestMetro.distKm)})` : L.noMetro,
      winner: !pE.nearestMetro && !cE.nearestMetro ? "tie"
            : !cE.nearestMetro ? "primary"
            : !pE.nearestMetro ? "compare"
            : pE.nearestMetro.distKm < cE.nearestMetro.distKm ? "primary" : "compare",
    },
    {
      label: L.source,
      primary: pE.dataSource === "real" ? L.real : L.sim,
      compare: cE.dataSource === "real" ? L.real : L.sim,
      winner: pE.dataSource === cE.dataSource ? "tie"
            : pE.dataSource === "real" ? "primary" : "compare",
    },
  ];

  // حساب الفائز الإجمالي
  const pWins = rows.filter((r) => r.winner === "primary").length;
  const cWins = rows.filter((r) => r.winner === "compare").length;
  const overallWinner = pWins > cWins ? "primary" : cWins > pWins ? "compare" : "tie";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">{L.title}</h2>
        {overallWinner !== "tie" && (
          <p className="text-sm mt-1 font-medium text-green-600">
            {overallWinner === "primary" ? L.first : L.second} {lang === "en" ? "wins overall" : "أفضل بشكل عام"} ({overallWinner === "primary" ? pWins : cWins}/{rows.length})
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 w-28"></th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-blue-700 bg-blue-50">
                {L.first}
              </th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-purple-700 bg-purple-50">
                {L.second}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 px-4 text-xs text-gray-500 font-medium">{row.label}</td>
                <td className={`py-3 px-4 text-center text-sm ${
                  row.winner === "primary" ? "font-bold text-green-700 bg-green-50" : "text-gray-700"
                }`}>
                  {row.primary}
                  {row.winner === "primary" && (
                    <span className="mr-1 text-xs">✓</span>
                  )}
                </td>
                <td className={`py-3 px-4 text-center text-sm ${
                  row.winner === "compare" ? "font-bold text-green-700 bg-green-50" : "text-gray-700"
                }`}>
                  {row.compare}
                  {row.winner === "compare" && (
                    <span className="mr-1 text-xs">✓</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
