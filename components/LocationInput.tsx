"use client";

import { useState } from "react";
import { parseInput, type Coordinates } from "@/lib/parseGoogleMapsUrl";
import { useI18n, translations } from "@/lib/i18n";

export interface SearchParams extends Coordinates {
  propertyType?: string;
  area?: number;
  district?: string;
  placeName?: string;
}

interface LocationInputProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

export default function LocationInput({ onSearch, isLoading }: LocationInputProps) {
  const { t, lang } = useI18n();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [propertyType, setPropertyType] = useState<string>(translations.propTypes.ar[0]);
  const [area, setArea] = useState("");
  const [district, setDistrict] = useState("");

  const propTypes = translations.propTypes[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = parseInput(input);
    const districtVal = district.trim() || undefined;
    const ptIndex = propTypes.indexOf(propertyType);
    const ptAr = ptIndex > 0 ? translations.propTypes.ar[ptIndex] : undefined;

    if (result.success && result.coordinates) {
      onSearch({ ...result.coordinates, propertyType: ptAr, area: area ? Number(area) : undefined, district: districtVal, placeName: result.placeName });
      return;
    }
    if (result.needsServerResolve) {
      try {
        const res = await fetch("/api/resolve-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: input.trim() }) });
        if (!res.ok) { setError((await res.json()).error || t("formatsLabel")); return; }
        const data = await res.json();
        onSearch({ lat: data.lat, lng: data.lng, propertyType: ptAr, area: area ? Number(area) : undefined, district: districtVal, placeName: data.placeName });
        return;
      } catch { setError(t("formatsLabel")); return; }
    }
    setError(result.error || t("formatsLabel"));
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{t("appTitle")}</h1>
          <p className="text-gray-500 text-sm md:text-base">{t("appSubtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="loc-input" className="block text-sm font-medium text-gray-700 mb-2">{t("locationLabel")}</label>
            <input id="loc-input" type="text" value={input} onChange={(e) => { setInput(e.target.value); setError(""); }} placeholder={t("locationPlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("districtLabel")} <span className="text-xs text-gray-400">{t("districtHint")}</span>
            </label>
            <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t("districtPlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("propTypeLabel")} <span className="text-xs text-gray-400">{t("propTypeHint")}</span>
              </label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm">
                {propTypes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("areaLabel")} <span className="text-xs text-gray-400">{t("propTypeHint")}</span>
              </label>
              <input type="number" min="1" value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("areaPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <button type="submit" disabled={isLoading || !input.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
            {isLoading ? (<><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t("analyzingBtn")}</>) : t("analyzeBtn")}
          </button>
          <div className="text-xs text-gray-400 space-y-1">
            <p>{t("formatsLabel")}</p>
            <ul className="list-disc list-inside space-y-0.5 mx-2">
              <li dir="ltr" className={lang === "ar" ? "text-right" : ""}>24.7136, 46.6753</li>
              <li dir="ltr" className={lang === "ar" ? "text-right" : ""}>https://maps.google.com/...@24.71,46.67...</li>
              <li dir="ltr" className={lang === "ar" ? "text-right" : ""}>https://maps.app.goo.gl/...</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
