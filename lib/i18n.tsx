"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

// ── ترجمات كاملة ──────────────────────────────────────────────────────────────
export const translations = {
  // ── عام ────────────────────────────────────────────────────────────────────
  appTitle:        { ar: "محلل موقع العقار",               en: "Property Location Analyzer" },
  appSubtitle:     { ar: "تقديرات مبنية على بيانات السوق", en: "Estimates based on market data" },
  navAnalyze:      { ar: "تحليل الأسعار ←",                en: "Price Analysis →" },
  navData:         { ar: "إدارة البيانات ←",               en: "Manage Data →" },
  navHome:         { ar: "← الرئيسية",                     en: "← Home" },
  footerNote:      { ar: "الأسعار تقديرية وليست فعلية - للتقييم الدقيق راجع مقيّم عقاري معتمد",
                     en: "Prices are estimates only. Consult a certified appraiser for accurate valuation." },

  // ── LocationInput ──────────────────────────────────────────────────────────
  locationLabel:   { ar: "الموقع",                         en: "Location" },
  locationPlaceholder: { ar: "24.7136, 46.6753 أو رابط Google Maps",
                          en: "24.7136, 46.6753 or Google Maps link" },
  districtLabel:   { ar: "الحي / المنطقة",                 en: "District / Area" },
  districtHint:    { ar: "(اختياري — يحسّن الدقة كثيراً)", en: "(optional — improves accuracy)" },
  districtPlaceholder: { ar: "مثال: إشبيليا، النرجس...",  en: "e.g. Al-Nargis, Al-Malqa..." },
  propTypeLabel:   { ar: "نوع العقار",                     en: "Property Type" },
  propTypeHint:    { ar: "(يحسّن الدقة)",                  en: "(improves accuracy)" },
  areaLabel:       { ar: "المساحة (م²)",                   en: "Area (m²)" },
  areaPlaceholder: { ar: "مثال: 150",                      en: "e.g. 150" },
  analyzeBtn:      { ar: "تحليل الموقع",                   en: "Analyze Location" },
  analyzingBtn:    { ar: "جاري التحليل...",                 en: "Analyzing..." },
  formatsLabel:    { ar: "الصيغ المدعومة:",                 en: "Supported formats:" },
  unspecified:     { ar: "غير محدد",                       en: "Unspecified" },

  // أنواع العقارات
  propTypes: {
    ar: ["غير محدد", "شقة", "فيلا", "دور", "أرض", "تجاري", "استوديو", "غرفة"] as string[],
    en: ["Unspecified", "Apartment", "Villa", "Floor", "Land", "Commercial", "Studio", "Room"] as string[],
  },

  // ── SatelliteView ─────────────────────────────────────────────────────────
  aerialTitle:     { ar: "الصورة الجوية للموقع",           en: "Aerial View" },
  openInMaps:      { ar: "فتح في Google Maps",             en: "Open in Google Maps" },

  // ── PriceEstimate ─────────────────────────────────────────────────────────
  priceTitle:      { ar: "تقديرات أسعار العقارات",         en: "Property Price Estimates" },
  realData:        { ar: "بيانات حقيقية",                  en: "Real Data" },
  simulation:      { ar: "تقدير إحصائي",                   en: "Statistical Estimate" },
  txCount:         { ar: "صفقة",                           en: "transactions" },
  locScore:        { ar: "مؤشر جودة الموقع",               en: "Location Quality Score" },
  locScoreNote:    { ar: "بناءً على أسعار المنطقة والموقع", en: "Based on area prices and location" },
  metroBonus:      { ar: "+ قرب المترو",                   en: "+ metro proximity" },
  confidenceTitle: { ar: "مستوى الثقة بالتقدير",           en: "Estimate Confidence Level" },
  nearbyTx:        { ar: "صفقة قريبة (≤20 كم)",            en: "nearby transactions (≤20 km)" },
  confidenceHigh:  { ar: "بيانات وفيرة وقريبة — التقدير دقيق جداً",
                     en: "Abundant nearby data — very accurate estimate" },
  confidenceMed:   { ar: "بيانات كافية — التقدير موثوق",   en: "Sufficient data — reliable estimate" },
  confidenceLow:   { ar: "بيانات محدودة — أضف صفقات قريبة لتحسين الدقة",
                     en: "Limited data — add nearby transactions to improve accuracy" },
  confidenceWeak:  { ar: "بيانات قليلة — التقدير تقريبي",  en: "Sparse data — rough estimate" },
  priceSaleSqm:    { ar: "سعر المتر المربع (بيع)",          en: "Price per m² (sale)" },
  sarSqm:          { ar: "ريال سعودي / م²",                en: "SAR / m²" },
  monthlyRent:     { ar: "الإيجار الشهري التقديري",         en: "Estimated Monthly Rent" },
  sarMonth:        { ar: "ريال سعودي / شهر",               en: "SAR / month" },
  priceRange:      { ar: "نطاق سعر المتر في المنطقة",       en: "Price Range per m² in Area" },
  priceMin:        { ar: "الحد الأدنى",                    en: "Min" },
  priceMax:        { ar: "الحد الأعلى",                    en: "Max" },
  sarUnit:         { ar: "ريال سعودي / م²",                en: "SAR / m²" },
  disclaimerReal:  { ar: "التقدير مبني على صفقات حقيقية باستخدام KNN. للتقييم الدقيق راجع مقيّماً معتمداً.",
                     en: "Estimate based on real transactions using KNN. Consult a certified appraiser for accuracy." },
  disclaimerSim:   { ar: "لم تُضَف بعد صفقات حقيقية. الأسعار تقديرية. أضف بيانات من صفحة البيانات.",
                     en: "No real transactions added yet. Prices are estimated. Add data from the Data page." },
  areaClass:       {
    ar: { "منطقة راقية": "منطقة راقية", "منطقة جيدة": "منطقة جيدة", "منطقة متوسطة": "منطقة متوسطة", "منطقة نائية": "منطقة نائية" },
    en: { "منطقة راقية": "Premium Area", "منطقة جيدة": "Good Area", "منطقة متوسطة": "Average Area", "منطقة نائية": "Peripheral Area" },
  },

  // ── TransportInfo ──────────────────────────────────────────────────────────
  nearbyTitle:     { ar: "المرافق القريبة",                 en: "Nearby Facilities" },
  nearbySubtitle:  { ar: "أقرب محطة مترو واستاد من الموقع", en: "Nearest metro station and stadium" },
  metroTitle:      { ar: "محطة المترو",                     en: "Metro Station" },
  stadiumTitle:    { ar: "الاستاد",                         en: "Stadium" },
  routeBtn:        { ar: "المسار ←",                        en: "Route →" },
  locationBonus:   { ar: "للموقع",                         en: "location bonus" },

  // ── ExportPDF ─────────────────────────────────────────────────────────────
  exportTitle:     { ar: "تصدير تقرير PDF",                en: "Export PDF Report" },
  exportSubtitle:  { ar: "يتضمن: تفاصيل العقار · الخريطة مع المترو والاستاد · تقديرات الأسعار",
                     en: "Includes: property details · map with metro & stadium · price estimates" },
  exportAr:        { ar: "تقرير عربي",                     en: "Arabic Report" },
  exportEn:        { ar: "English Report",                 en: "English Report" },

  // ── Report page ────────────────────────────────────────────────────────────
  reportPreview:   { ar: "معاينة التقرير",                  en: "Report Preview" },
  printBtn:        { ar: "طباعة / حفظ PDF",                en: "Print / Save as PDF" },
  closeBtn:        { ar: "إغلاق",                          en: "Close" },
  noReportData:    { ar: "لا توجد بيانات تقرير",           en: "No report data found" },
  noReportHint:    { ar: "ارجع للصفحة الرئيسية وحدد موقع العقار أولاً",
                     en: "Go back to the home page and search for a property first" },

  // ── Data page ─────────────────────────────────────────────────────────────
  dataTitle:       { ar: "بيانات الصفقات العقارية",        en: "Property Transactions Data" },
  dataSubtitle:    { ar: "أضف صفقات حقيقية لتحسين دقة تقديرات الأسعار",
                     en: "Add real transactions to improve price estimate accuracy" },
  tabManual:       { ar: "إضافة يدوية",                    en: "Manual Entry" },
  tabCSV:          { ar: "لصق CSV / Excel",                en: "Paste CSV / Excel" },
  tabFile:         { ar: "رفع ملف",                        en: "Upload File" },
  savedTxTitle:    { ar: "الصفقات المحفوظة",               en: "Saved Transactions" },
  txUnit:          { ar: "صفقة",                           en: "transactions" },
  deleteAll:       { ar: "حذف الكل",                       en: "Delete All" },
  deleteOne:       { ar: "حذف",                            en: "Delete" },
  addTxBtn:        { ar: "إضافة الصفقة",                   en: "Add Transaction" },
  savingBtn:       { ar: "جاري الحفظ...",                  en: "Saving..." },
  importBtn:       { ar: "استيراد البيانات",               en: "Import Data" },
  importFileBtn:   { ar: "استيراد الملف",                  en: "Import File" },
  importingBtn:    { ar: "جاري الاستيراد...",              en: "Importing..." },
  cityLabel:       { ar: "المدينة",                        en: "City" },
  districtCol:     { ar: "الحي",                           en: "District" },
  typeCol:         { ar: "النوع",                          en: "Type" },
  areaCol:         { ar: "المساحة",                        en: "Area" },
  totalPrice:      { ar: "السعر الإجمالي",                 en: "Total Price" },
  priceSqmCol:     { ar: "سعر المتر",                      en: "Price/m²" },
  sourceCol:       { ar: "المصدر",                         en: "Source" },
  sarAbbr:         { ar: "ر",                              en: "SAR" },
  sqmAbbr:         { ar: "م²",                             en: "m²" },
  noTxMsg:         { ar: "لا توجد صفقات محفوظة بعد",       en: "No transactions saved yet" },
  noTxHint:        { ar: "أضف صفقات لتحسين دقة التسعير",   en: "Add transactions to improve pricing accuracy" },
  loadingMsg:      { ar: "جاري التحميل...",                en: "Loading..." },
  cityRequired:    { ar: "المدينة *",                      en: "City *" },
  districtRequired:{ ar: "الحي *",                        en: "District *" },
  areaRequired:    { ar: "المساحة (م²) *",                 en: "Area (m²) *" },
  priceRequired:   { ar: "السعر الإجمالي (ريال) *",        en: "Total Price (SAR) *" },
  sourceOptional:  { ar: "المصدر",                         en: "Source" },
  sourcePlaceholder:{ ar: "مثال: عقار، مستقل...",         en: "e.g. Aqar, Bayut..." },
  coordsOptional:  { ar: "+ إحداثيات الموقع (اختياري)",   en: "+ Coordinates (optional)" },
  latLabel:        { ar: "خط العرض (Latitude)",            en: "Latitude" },
  lngLabel:        { ar: "خط الطول (Longitude)",           en: "Longitude" },
  dateLabel:       { ar: "التاريخ (اختياري)",              en: "Date (optional)" },
  confirmDeleteAll:{ ar: "هل أنت متأكد من حذف جميع الصفقات",
                     en: "Are you sure you want to delete all transactions" },
  confirmDeleteOne:{ ar: "هل أنت متأكد من حذف هذه الصفقة؟", en: "Delete this transaction?" },
  fillRequired:    { ar: "يرجى ملء جميع الحقول المطلوبة", en: "Please fill in all required fields" },
  csvFormatTitle:  { ar: "تنسيق البيانات المقبول:",        en: "Accepted data format:" },
  csvPasteHint:    { ar: "يمكنك لصق البيانات مباشرة من Excel أو بصيغة CSV.",
                     en: "You can paste data directly from Excel or in CSV format." },
  csvNoCoords:     { ar: "بدون إحداثيات:",                 en: "Without coordinates:" },
  csvWithCoords:   { ar: "مع إحداثيات (أدق):",            en: "With coordinates (more accurate):" },
  csvSepHint:      { ar: "• الفاصل: فاصلة أو Tab (من Excel)  • سطر العنوان اختياري",
                     en: "• Separator: comma or Tab (from Excel)  • Header row is optional" },
  csvPastePlaceholder: { ar: "الصق بياناتك هنا...",       en: "Paste your data here..." },
  fileFormats:     { ar: "الصيغ المقبولة: Excel (.xlsx / .xls) أو CSV (.csv)",
                     en: "Accepted formats: Excel (.xlsx / .xls) or CSV (.csv)" },
  fileColsHint:    { ar: "يجب أن يحتوي الملف على أعمدة: المدينة، الحي، النوع، المساحة، السعر",
                     en: "File must contain columns: City, District, Type, Area, Price" },
  fileOptCols:     { ar: "الأعمدة الاختيارية: خط العرض، خط الطول، التاريخ، المصدر",
                     en: "Optional columns: Latitude, Longitude, Date, Source" },
  fileIdle:        { ar: "انقر لاختيار ملف أو اسحب وأفلت هنا",
                     en: "Click to choose a file or drag and drop here" },
  fileReady:       { ar: "الملف جاهز — اضغط \"استيراد الملف\" للمتابعة",
                     en: "File ready — press \"Import File\" to continue" },
  fileError:       { ar: "تعذّرت القراءة — انقر لاختيار ملف آخر",
                     en: "Failed to read — click to choose another file" },
  previewTitle:    { ar: "معاينة الصفوف المستوردة",        en: "Preview of imported rows" },

  // ── Analyze page ──────────────────────────────────────────────────────────
  analyzeTitle:    { ar: "تحليل أسعار العقارات",           en: "Property Price Analysis" },
  analyzedTx:      { ar: "صفقة مُحللة",                   en: "analyzed transactions" },
  filterTitle:     { ar: "فلترة النتائج",                   en: "Filter Results" },
  filterDealType:  { ar: "نوع الصفقة",                     en: "Transaction Type" },
  filterPropType:  { ar: "نوع العقار",                     en: "Property Type" },
  filterRegion:    { ar: "المنطقة الإدارية",               en: "Administrative Region" },
  allFilter:       { ar: "الكل",                           en: "All" },
  tabByCity:       { ar: "حسب المدينة والحي",              en: "By City & District" },
  tabByType:       { ar: "حسب نوع العقار",                 en: "By Property Type" },
  tabByDeal:       { ar: "بيع vs إيجار",                   en: "Sale vs Rent" },
  tabByRegion:     { ar: "حسب المنطقة",                    en: "By Region" },
  noData:          { ar: "لا توجد بيانات",                 en: "No data available" },
  txCount2:        { ar: "صفقات",                          en: "transactions" },
  medianPsqm:      { ar: "وسيط سعر المتر",                 en: "Median price/m²" },
  avgPsqm:         { ar: "متوسط سعر المتر",                en: "Avg price/m²" },
  p25:             { ar: "ربعي أدنى (P25)",                en: "Lower quartile (P25)" },
  p75:             { ar: "ربعي أعلى (P75)",                en: "Upper quartile (P75)" },
  medianArea:      { ar: "وسيط المساحة",                   en: "Median area" },
  txCountCol:      { ar: "عدد الصفقات",                    en: "Transactions" },
  districtCol2:    { ar: "الحي",                           en: "District" },
  p25p75Range:     { ar: "P25 ↔ P75",                      en: "P25 ↔ P75" },
  medianAreaCol:   { ar: "وسيط المساحة",                   en: "Median Area" },
  medianNote:      { ar: "الوسيط أدق من المتوسط لأنه يتجاهل الأسعار الشاذة",
                     en: "Median is more accurate than average as it ignores outliers" },
  analyzeLoading:  { ar: "جاري تحليل البيانات...",         en: "Analyzing data..." },
  analyzeError:    { ar: "تعذّر تحميل بيانات التحليل",     en: "Failed to load analysis data" },
} as const;

export type TKey = keyof typeof translations;

// ── Context ────────────────────────────────────────────────────────────────
interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextValue>({
  lang: "ar",
  setLang: () => {},
  t: (key) => {
    const entry = translations[key];
    if (entry && "ar" in entry && typeof (entry as {ar: unknown}).ar === "string") return (entry as {ar: string}).ar;
    return key;
  },
  dir: "rtl",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  // تحميل اللغة المحفوظة من localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "ar" || saved === "en") {
      setLangState(saved);
    }
  }, []);

  // تحديث dir و lang على <html> عند التغيير
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const t = (key: TKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    if (typeof entry === "object" && "ar" in entry && "en" in entry) {
      return (entry as { ar: string; en: string })[lang];
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
