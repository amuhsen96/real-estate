"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportData } from "@/components/PropertyReport";
import PropertyReport from "@/components/PropertyReport";

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [ready, setReady] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("reportData");
    const storedLang = sessionStorage.getItem("reportLang") as "ar" | "en" | null;
    if (raw) {
      try {
        setData(JSON.parse(raw));
        setLang(storedLang ?? "ar");
      } catch { /* empty */ }
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center text-gray-500 space-y-2">
          <p className="text-lg font-medium">لا توجد بيانات تقرير</p>
          <p className="text-sm">ارجع للصفحة الرئيسية وحدد موقع العقار أولاً</p>
          <button
            onClick={() => window.close()}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* شريط التحكم — يختفي عند الطباعة */}
      <div className="print:hidden fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            ✕ {lang === "ar" ? "إغلاق" : "Close"}
          </button>
          <span className="text-sm font-medium text-gray-700">
            {lang === "ar" ? "معاينة التقرير" : "Report Preview"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
        >
          🖨 {lang === "ar" ? "طباعة / حفظ PDF" : "Print / Save as PDF"}
        </button>
      </div>

      {/* التقرير */}
      <div className="print:p-0 pt-16 flex justify-center bg-gray-100 min-h-screen print:bg-white print:block">
        <div className="my-6 print:my-0 shadow-xl print:shadow-none">
          <PropertyReport data={data} lang={lang} reportRef={reportRef} />
        </div>
      </div>

      {/* CSS للطباعة */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
