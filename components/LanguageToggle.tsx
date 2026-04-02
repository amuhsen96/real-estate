"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 px-3 py-2 rounded-full shadow-sm transition-colors font-medium"
      title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
    >
      <span>{lang === "ar" ? "🇬🇧" : "🇸🇦"}</span>
      <span>{lang === "ar" ? "English" : "عربي"}</span>
    </button>
  );
}
