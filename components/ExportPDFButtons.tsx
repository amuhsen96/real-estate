"use client";

import { useI18n } from "@/lib/i18n";
import type { ReportData } from "./PropertyReport";

interface Props {
  reportData: ReportData;
  disabled?: boolean;
}

export default function ExportPDFButtons({ reportData, disabled }: Props) {
  const { t } = useI18n();

  const openReport = (lang: "ar" | "en") => {
    if (disabled) return;
    sessionStorage.setItem("reportData", JSON.stringify(reportData));
    sessionStorage.setItem("reportLang", lang);
    window.open("/report", "_blank");
  };

  return (
    <div className="flex gap-3">
      <button onClick={() => openReport("ar")} disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
        {disabled ? <span className="animate-spin">⏳</span> : <span>📄</span>} {t("exportAr")}
      </button>
      <button onClick={() => openReport("en")} disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
        {disabled ? <span className="animate-spin">⏳</span> : <span>📄</span>} {t("exportEn")}
      </button>
    </div>
  );
}
