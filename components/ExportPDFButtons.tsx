"use client";

import { useI18n } from "@/lib/i18n";
import type { ReportData } from "./PropertyReport";

interface Props {
  reportData: ReportData;
}

export default function ExportPDFButtons({ reportData }: Props) {
  const { t } = useI18n();

  const openReport = (lang: "ar" | "en") => {
    sessionStorage.setItem("reportData", JSON.stringify(reportData));
    sessionStorage.setItem("reportLang", lang);
    window.open("/report", "_blank");
  };

  return (
    <div className="flex gap-3">
      <button onClick={() => openReport("ar")}
        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
        <span>📄</span> {t("exportAr")}
      </button>
      <button onClick={() => openReport("en")}
        className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
        <span>📄</span> {t("exportEn")}
      </button>
    </div>
  );
}
