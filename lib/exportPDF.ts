/**
 * تصدير تقرير PDF من عنصر HTML
 * يستخدم html2canvas لالتقاط الصورة ثم jsPDF لحفظها
 */
export async function exportReportPDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // تحميل المكتبتين بشكل ديناميكي (client-only)
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // انتظر تحميل الصور داخل العنصر
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

  // التقاط العنصر كصورة عالية الجودة
  const canvas = await html2canvas(element, {
    scale: 2,                // ضعف الدقة
    useCORS: true,           // للصور الخارجية (خريطة OSM)
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    width: element.offsetWidth,
    height: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const imgW = canvas.width;
  const imgH = canvas.height;

  // A4: 210 × 297 mm
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
