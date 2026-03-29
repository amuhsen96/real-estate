"use client";

// هذا المكوّن يُحمَّل على جهة العميل فقط (ssr: false)
// لذلك يمكن استيراد مكتبات المتصفح مباشرة
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { ReportData } from "./PropertyReport";

interface Props {
  reportData: ReportData;
  arRef: React.RefObject<HTMLDivElement | null>;
  enRef: React.RefObject<HTMLDivElement | null>;
}

async function doExport(element: HTMLElement, filename: string) {
  // انتظار تحميل الصور
  const images = element.querySelectorAll("img");
  await Promise.allSettled(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) { resolve(); return; }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    width: element.offsetWidth,
    height: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const imgW = canvas.width;
  const imgH = canvas.height;
  const pdfW = 210;
  const pdfH = Math.ceil((imgH / imgW) * pdfW);

  const pdf = new jsPDF({
    orientation: pdfH > pdfW ? "portrait" : "landscape",
    unit: "mm",
    format: [pdfW, pdfH],
  });

  pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
  pdf.save(filename);
}

export default function ExportPDFButtons({ arRef, enRef, reportData }: Props) {
  const city = reportData.estimate.cityName ?? "report";
  const date = new Date().toISOString().slice(0, 10);

  const handleExport = async (lang: "ar" | "en") => {
    const ref = lang === "ar" ? arRef : enRef;
    if (!ref.current) return;
    const btn = document.getElementById(`pdf-btn-${lang}`) as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = lang === "ar" ? "جاري التصدير..." : "Exporting..."; }
    try {
      await doExport(ref.current, `property-report-${lang}-${city}-${date}.pdf`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = lang === "ar" ? "تقرير عربي" : "English Report";
      }
    }
  };

  return (
    <div className="flex gap-3">
      <button
        id="pdf-btn-ar"
        onClick={() => handleExport("ar")}
        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
      >
        <span>📄</span> تقرير عربي
      </button>
      <button
        id="pdf-btn-en"
        onClick={() => handleExport("en")}
        className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
      >
        <span>📄</span> English Report
      </button>
    </div>
  );
}
