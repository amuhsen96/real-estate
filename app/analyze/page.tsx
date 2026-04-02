"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AnalyzeResult, GroupStats } from "@/app/api/analyze/route";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function StatBadge({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-base font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatsRow({ stats, labels }: { stats: GroupStats; labels: Record<string, string> }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
      <StatBadge label={labels.medianPsqm} value={`${fmt(stats.medianPricePerSqm)}`} sub={labels.sarSqmUnit} />
      <StatBadge label={labels.avgPsqm} value={`${fmt(stats.avgPricePerSqm)}`} sub={labels.sarSqmUnit} />
      <StatBadge label={labels.p25} value={`${fmt(stats.p25PricePerSqm)}`} sub={labels.sarSqmUnit} />
      <StatBadge label={labels.p75} value={`${fmt(stats.p75PricePerSqm)}`} sub={labels.sarSqmUnit} />
      <StatBadge label={labels.medianArea} value={`${fmt(stats.medianArea)}`} sub={labels.sqmUnit} />
      <StatBadge label={labels.txCountCol} value={fmt(stats.count)} />
    </div>
  );
}

export default function AnalyzePage() {
  const { t, lang, dir } = useI18n();

  const [data, setData] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterDealType, setFilterDealType] = useState("");
  const [filterPropertyType, setFilterPropertyType] = useState("");
  const [filterRegion, setFilterRegion] = useState("");

  // UI
  const [activeTab, setActiveTab] = useState<"city" | "type" | "deal" | "region">("city");
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterDealType) params.set("dealType", filterDealType);
      if (filterPropertyType) params.set("propertyType", filterPropertyType);
      if (filterRegion) params.set("region", filterRegion);
      const res = await fetch(`/api/analyze?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      setData(await res.json());
    } catch {
      setError(t("analyzeError"));
    } finally {
      setLoading(false);
    }
  }, [filterDealType, filterPropertyType, filterRegion]);

  useEffect(() => { load(); }, [load]);

  // Extract unique filter lists
  const dealTypes = data ? Object.keys(data.byDealType).filter((k) => k !== "غير محدد") : [];
  const propertyTypes = data ? Object.keys(data.byPropertyType).filter((k) => k !== "غير محدد") : [];
  const regions = data ? Object.keys(data.byRegion).filter((k) => k !== "غير محدد") : [];

  // Sort cities by transaction count descending
  const sortedCities = data
    ? Object.entries(data.byCity).sort((a, b) => b[1].count - a[1].count)
    : [];

  // Labels passed to StatsRow (avoids calling hooks inside non-component functions)
  const statsLabels = {
    medianPsqm: t("medianPsqm"),
    avgPsqm: t("avgPsqm"),
    p25: t("p25"),
    p75: t("p75"),
    medianArea: t("medianArea"),
    txCountCol: t("txCountCol"),
    sarSqmUnit: lang === "en" ? "SAR/m²" : "ر/م²",
    sqmUnit: lang === "en" ? "m²" : "م²",
  };

  const sharedTableHeaders = (
    <tr className="bg-gray-50 border-b border-gray-100">
      <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Property Type" : "نوع العقار"}</th>
      <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Transactions" : "صفقات"}</th>
      <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Median/m²" : "وسيط المتر"}</th>
      <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Avg/m²" : "متوسط المتر"}</th>
      <th className="px-4 py-3 text-right font-medium text-gray-600">{t("p25p75Range")}</th>
      <th className="px-4 py-3 text-right font-medium text-gray-600">{t("medianAreaCol")}</th>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4" dir={dir}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t("analyzeTitle")}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {data ? `${fmt(data.totalTransactions)} ${t("analyzedTx")}` : t("loadingMsg")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/data" className="text-sm text-gray-500 hover:text-blue-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              {t("navData")}
            </Link>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors">
              {t("navHome")}
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-600 mb-3">{t("filterTitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("filterDealType")}</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={filterDealType}
                onChange={(e) => setFilterDealType(e.target.value)}
              >
                <option value="">{t("allFilter")}</option>
                {dealTypes.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("filterPropType")}</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={filterPropertyType}
                onChange={(e) => setFilterPropertyType(e.target.value)}
              >
                <option value="">{t("allFilter")}</option>
                {propertyTypes.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("filterRegion")}</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
              >
                <option value="">{t("allFilter")}</option>
                {regions.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-center text-sm">
            {t("analyzeError")}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
            {t("analyzeLoading")}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {([
                  { key: "city", label: t("tabByCity") },
                  { key: "type", label: t("tabByType") },
                  { key: "deal", label: t("tabByDeal") },
                  { key: "region", label: t("tabByRegion") },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-4">

                {/* By City & District */}
                {activeTab === "city" && (
                  sortedCities.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">{t("noData")}</p>
                  ) : (
                    sortedCities.map(([city, stats]) => (
                      <div key={city} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-right"
                          onClick={() => setExpandedCity(expandedCity === city ? null : city)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-800">{city}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {fmt(stats.count)} {t("txCount2")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {lang === "en" ? "Median:" : "وسيط:"} {fmt(stats.medianPricePerSqm)} {lang === "en" ? "SAR/m²" : "ر/م²"}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm">{expandedCity === city ? "▲" : "▼"}</span>
                        </button>

                        {expandedCity === city && (
                          <div className="px-4 pb-4">
                            <StatsRow stats={stats} labels={statsLabels} />

                            {/* Districts */}
                            <div className="mt-4">
                              <p className="text-xs font-medium text-gray-600 mb-2">
                                {lang === "en" ? "District Details" : "تفاصيل الأحياء"}
                              </p>
                              <div className="overflow-x-auto rounded-xl border border-gray-100">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                      <th className="px-3 py-2 text-right font-medium text-gray-600">{t("districtCol2")}</th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600">{lang === "en" ? "Transactions" : "صفقات"}</th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600">{lang === "en" ? "Median/m²" : "وسيط المتر"}</th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600">{lang === "en" ? "Avg/m²" : "متوسط المتر"}</th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600">{t("p25p75Range")}</th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600">{t("medianAreaCol")}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {Object.entries(stats.byDistrict)
                                      .sort((a, b) => b[1].count - a[1].count)
                                      .map(([district, ds]) => (
                                        <tr key={district} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-medium text-gray-800">{district}</td>
                                          <td className="px-3 py-2 text-gray-600">{fmt(ds.count)}</td>
                                          <td className="px-3 py-2 text-green-700 font-semibold">{fmt(ds.medianPricePerSqm)}</td>
                                          <td className="px-3 py-2 text-blue-700">{fmt(ds.avgPricePerSqm)}</td>
                                          <td className="px-3 py-2 text-gray-500">
                                            {fmt(ds.p25PricePerSqm)} — {fmt(ds.p75PricePerSqm)}
                                          </td>
                                          <td className="px-3 py-2 text-gray-500">{fmt(ds.medianArea)} {lang === "en" ? "m²" : "م²"}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )
                )}

                {/* By Property Type */}
                {activeTab === "type" && (
                  Object.entries(data.byPropertyType).length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">{t("noData")}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          {sharedTableHeaders}
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {Object.entries(data.byPropertyType)
                            .sort((a, b) => b[1].count - a[1].count)
                            .map(([type, stats]) => (
                              <tr key={type} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{type}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{fmt(stats.count)}</td>
                                <td className="px-4 py-3 text-green-700 font-semibold">{fmt(stats.medianPricePerSqm)} {lang === "en" ? "SAR/m²" : "ر/م²"}</td>
                                <td className="px-4 py-3 text-blue-700">{fmt(stats.avgPricePerSqm)} {lang === "en" ? "SAR/m²" : "ر/م²"}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {fmt(stats.p25PricePerSqm)} — {fmt(stats.p75PricePerSqm)}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{fmt(stats.medianArea)} {lang === "en" ? "m²" : "م²"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* Sale vs Rent */}
                {activeTab === "deal" && (
                  Object.entries(data.byDealType).length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">{t("noData")}</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(data.byDealType)
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([dealType, stats]) => (
                          <div key={dealType} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                dealType === "بيع" ? "bg-green-100 text-green-700" :
                                dealType === "إيجار" ? "bg-orange-100 text-orange-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>{dealType}</span>
                              <span className="text-xs text-gray-500">{fmt(stats.count)} {t("txCount2")}</span>
                            </div>
                            <StatsRow stats={stats} labels={statsLabels} />
                          </div>
                        ))}
                    </div>
                  )
                )}

                {/* By Region */}
                {activeTab === "region" && (
                  Object.entries(data.byRegion).length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">{t("noData")}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Region" : "المنطقة"}</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Transactions" : "صفقات"}</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Median/m²" : "وسيط المتر"}</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">{lang === "en" ? "Avg/m²" : "متوسط المتر"}</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">{t("p25p75Range")}</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">{t("medianAreaCol")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {Object.entries(data.byRegion)
                            .sort((a, b) => b[1].count - a[1].count)
                            .map(([region, stats]) => (
                              <tr key={region} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{region}</td>
                                <td className="px-4 py-3 text-gray-600">{fmt(stats.count)}</td>
                                <td className="px-4 py-3 text-green-700 font-semibold">{fmt(stats.medianPricePerSqm)} {lang === "en" ? "SAR/m²" : "ر/م²"}</td>
                                <td className="px-4 py-3 text-blue-700">{fmt(stats.avgPricePerSqm)} {lang === "en" ? "SAR/m²" : "ر/م²"}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {fmt(stats.p25PricePerSqm)} — {fmt(stats.p75PricePerSqm)}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{fmt(stats.medianArea)} {lang === "en" ? "m²" : "م²"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

              </div>
            </div>
          </>
        )}

        <footer className="text-center text-xs text-gray-400 py-4">
          <p>{t("medianNote")}</p>
        </footer>
      </div>
    </div>
  );
}
