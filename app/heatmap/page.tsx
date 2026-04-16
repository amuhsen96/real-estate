"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PriceHeatmap from "@/components/PriceHeatmap";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

const DEAL_OPTIONS = [
  { value: "بيع",   labelAr: "بيع",   labelEn: "Sale" },
  { value: "إيجار", labelAr: "إيجار", labelEn: "Rent" },
  { value: "",      labelAr: "الكل",  labelEn: "All"  },
];

export default function HeatmapPage() {
  const { lang } = useI18n();
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [dealType, setDealType] = useState("بيع");
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => { if (d.cities) setCities(d.cities); })
      .catch(() => {});
  }, []);

  const filtered = inputValue.trim()
    ? cities.filter((c) => c.includes(inputValue.trim()))
    : cities;

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    setInputValue(city);
    setShowDropdown(false);
    setConfirmed(false);
  };

  const handleShow = () => {
    if (!inputValue.trim()) return;
    setSelectedCity(inputValue.trim());
    setConfirmed(true);
    setShowDropdown(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* شريط التنقل */}
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <Link href="/" className="text-xs bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 px-4 py-2 rounded-full shadow-sm transition-colors">
            {lang === "en" ? "← Home" : "→ الرئيسية"}
          </Link>
          <div className="flex gap-2">
            <LanguageToggle />
            <Link href="/analyze" className="text-xs bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 px-4 py-2 rounded-full shadow-sm transition-colors">
              {lang === "en" ? "Market Analysis" : "تحليل السوق"}
            </Link>
          </div>
        </div>

        {/* العنوان */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-5">
          <h1 className="text-xl font-bold text-gray-800 mb-1">
            🗺️ {lang === "en" ? "Price Heat Map" : "خريطة أسعار الأحياء"}
          </h1>
          <p className="text-sm text-gray-400">
            {lang === "en"
              ? "Average price per m² by district — color coded green (cheap) to red (expensive)"
              : "متوسط سعر المتر المربع لكل حي — أخضر (رخيص) إلى أحمر (غالٍ)"}
          </p>
        </div>

        {/* اختيار المدينة ونوع الصفقة */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* حقل المدينة */}
            <div className="relative flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {lang === "en" ? "City" : "المدينة"}
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowDropdown(true);
                  setConfirmed(false);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={lang === "en" ? "e.g. الرياض" : "مثال: الرياض"}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-right"
              />
              {showDropdown && filtered.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filtered.slice(0, 20).map((city) => (
                    <button
                      key={city}
                      onMouseDown={() => handleSelect(city)}
                      className="w-full text-right px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* نوع الصفقة */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {lang === "en" ? "Deal Type" : "نوع الصفقة"}
              </label>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {DEAL_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setDealType(o.value); setConfirmed(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      dealType === o.value
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {lang === "en" ? o.labelEn : o.labelAr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleShow}
            disabled={!inputValue.trim()}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm"
          >
            {lang === "en" ? "Show Heat Map" : "عرض الخريطة"}
          </button>
        </div>

        {/* الخريطة */}
        {confirmed && selectedCity && (
          <PriceHeatmap key={`${selectedCity}-${dealType}`} city={selectedCity} dealType={dealType} alwaysOpen />
        )}

        {/* تلميح أول زيارة */}
        {!confirmed && (
          <div className="text-center text-sm text-gray-400 py-4">
            {lang === "en"
              ? "Select a city above to display the map"
              : "اختر مدينة من القائمة أعلاه لعرض الخريطة"}
          </div>
        )}

      </div>
    </div>
  );
}
