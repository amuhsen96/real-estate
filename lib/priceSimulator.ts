import type { Coordinates } from "./parseGoogleMapsUrl";

export interface MetroStation {
  id: string;
  nameAr: string;
  line: number;
  lineColor: string;
  lineNameAr: string;
  lat: number;
  lng: number;
}

export interface Stadium {
  id: string;
  nameAr: string;
  city: string;
  lat: number;
  lng: number;
  capacity: number;
  teams: string[];
}

export interface NearestMetro {
  nameAr: string;
  lineNameAr: string;
  lineColor: string;
  distKm: number;
  routeUrl: string;
}

export interface NearestStadium {
  nameAr: string;
  city: string;
  teams: string[];
  distKm: number;
  routeUrl: string;
}

export interface Transaction {
  id: string;
  city: string;
  district: string;
  propertyType: string;
  area: number;        // م²
  price: number;       // الريال
  pricePerSqm: number; // الريال/م²
  dealType?: string;   // بيع | إيجار
  region?: string;     // المنطقة الإدارية
  lat?: number;
  lng?: number;
  date?: string;
  source?: string;
}

export interface ScoreBreakdown {
  metro:     number;   // 0–3
  geography: number;   // 0–2
  market:    number;   // 0–1
  // services (0–4) is calculated client-side from Overpass data
}

export interface PriceEstimate {
  pricePerSqmSale: number;
  monthlyRent: number;
  priceRangeMin: number;
  priceRangeMax: number;
  locationScore: number;      // base score: metro+geo+market (0–6), services added client-side
  scoreBreakdown: ScoreBreakdown;
  metroBonus?: number;        // kept for backward-compat (same as scoreBreakdown.metro)
  cityName: string;
  areaClassification: string;
  dataSource: "real" | "simulation";
  transactionCount?: number;
  confidence?: number;
  nearbyCount?: number;
  nearestMetro?: NearestMetro;
  nearestStadium?: NearestStadium;
}

// ── تطبيع اسم المدينة (يزيل بادئات: مدينة / محافظة / منطقة) ─────────────────
function normalizeCityName(name: string): string {
  return name
    .trim()
    .replace(/^(مدينة|محافظة|منطقة)\s+/u, "")
    .trim();
}

// ── مدن مرجعية ────────────────────────────────────────────────────────────────
const CITY_DATA = [
  { name: "الرياض",          center: { lat: 24.7136, lng: 46.6753 }, radius: 60, basePriceSale: 5500, baseRent: 35000 },
  { name: "جدة",             center: { lat: 21.4858, lng: 39.1925 }, radius: 40, basePriceSale: 5000, baseRent: 30000 },
  { name: "مكة المكرمة",    center: { lat: 21.3891, lng: 39.8579 }, radius: 25, basePriceSale: 6000, baseRent: 32000 },
  { name: "المدينة المنورة", center: { lat: 24.4539, lng: 39.6142 }, radius: 25, basePriceSale: 4500, baseRent: 25000 },
  { name: "الدمام",          center: { lat: 26.3927, lng: 49.9777 }, radius: 30, basePriceSale: 4000, baseRent: 22000 },
  { name: "الخبر",           center: { lat: 26.2172, lng: 50.1971 }, radius: 20, basePriceSale: 4500, baseRent: 25000 },
  { name: "الظهران",         center: { lat: 26.2361, lng: 50.0393 }, radius: 15, basePriceSale: 4200, baseRent: 23000 },
  { name: "تبوك",            center: { lat: 28.3998, lng: 36.5715 }, radius: 20, basePriceSale: 2500, baseRent: 15000 },
  { name: "أبها",            center: { lat: 18.2164, lng: 42.5053 }, radius: 15, basePriceSale: 2800, baseRent: 16000 },
  { name: "بريدة",           center: { lat: 26.3260, lng: 43.9750 }, radius: 15, basePriceSale: 2200, baseRent: 14000 },
  { name: "نجران",           center: { lat: 17.4933, lng: 44.1277 }, radius: 15, basePriceSale: 2000, baseRent: 12000 },
  { name: "حائل",            center: { lat: 27.5219, lng: 41.6907 }, radius: 15, basePriceSale: 2100, baseRent: 13000 },
];

// ── Haversine ──────────────────────────────────────────────────────────────────
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function detectCity(coords: Coordinates) {
  let closest = null;
  let minDist = Infinity;
  for (const city of CITY_DATA) {
    const dist = haversineDistance(coords, city.center);
    if (dist < city.radius && dist < minDist) {
      closest = city;
      minDist = dist;
    }
  }
  return { city: closest, distFromCenter: minDist };
}

function seededRandom(lat: number, lng: number): number {
  const x = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── تطبيع النص العربي ومطابقة تقريبية للأحياء ────────────────────────────────

/** تطبيع: حذف التشكيل، توحيد الهمزات والألف، إزالة "ال" التعريف */
function normalizeArabic(text: string): string {
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")   // حذف التشكيل والسكون والشدة
    .replace(/[أإآ]/g, "ا")                   // توحيد أشكال الألف
    .replace(/[ىئ]/g, "ي")                    // توحيد الياء
    .replace(/ة/g, "ه")                       // توحيد التاء المربوطة
    .replace(/^ال/, "")                       // إزالة "ال" التعريف من البداية
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** مسافة ليفنشتاين (لقياس الفرق بين سلسلتين) */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/**
 * مطابقة الحي مع تحمّل الأخطاء الإملائية الشائعة في العربية.
 * تعيد:
 *   "exact"   — تطابق تام بعد التطبيع
 *   "fuzzy"   — متشابه (مسافة تحرير ≤ 2 أو أحدهما يحتوي الآخر)
 *   "none"    — لا تطابق
 */
export function matchDistrict(
  query: string,
  candidate: string
): "exact" | "fuzzy" | "none" {
  if (!query || !candidate) return "none";
  const q = normalizeArabic(query);
  const c = normalizeArabic(candidate);
  if (q === c) return "exact";
  // تطابق جزئي (أحدهما يحتوي الآخر)
  if (q.length >= 3 && (c.includes(q) || q.includes(c))) return "fuzzy";
  // مسافة تحرير ≤ 2 للكلمات القصيرة/المتوسطة
  const maxDist = q.length <= 5 ? 1 : 2;
  if (levenshtein(q, c) <= maxDist) return "fuzzy";
  return "none";
}

// ── حساب وزن الحداثة بناءً على التاريخ ────────────────────────────────────────
function recencyWeight(dateStr?: string): number {
  if (!dateStr) return 1.0;
  try {
    const months =
      (new Date().getFullYear() - new Date(dateStr).getFullYear()) * 12 +
      (new Date().getMonth() - new Date(dateStr).getMonth());
    if (months <= 6) return 1.4;
    if (months <= 12) return 1.25;
    if (months <= 24) return 1.1;
    if (months <= 48) return 1.0;
    return 0.85; // بيانات قديمة جداً
  } catch {
    return 1.0;
  }
}

// ── خوارزمية KNN متعددة المعايير ─────────────────────────────────────────────
//
// الأولوية الأساسية: تطابق (الحي + نوع العقار) معاً
//
// للصفقات بدون إحداثيات — جدول الأوزان الأساسية:
//   نفس الحي + نفس النوع  → 6.0  ← المعيار الأساسي
//   نفس الحي + نوع مختلف  → 1.0
//   حي مختلف + نفس النوع  → 0.8
//   حي مختلف + نوع مختلف  → 0.1
//   (بدون معرفة الحي) نفس النوع → 1.0 | نوع مختلف → 0.4
//   (بدون معرفة النوع) نفس الحي → 2.0 | حي مختلف  → 0.3
//
// للصفقات ذات الإحداثيات:
//   1. المسافة الجغرافية  → وزن عكسي تربيعي (أقرب = أثقل)
//   2. تطابق نوع العقار   → 2.0× عند التطابق، 0.5× عند الاختلاف
//   3. تطابق الحي         → 1.8× عند التطابق، 0.9× عند الاختلاف
//   4. تشابه المساحة      → خصم حتى 30% عند التباين الكبير
//   5. حداثة الصفقة       → مضاعف من 0.85 إلى 1.4
//
// النتيجة: متوسط مرجّح لـ pricePerSqm + درجة الثقة
//
function estimatePriceFromTransactions(
  coords: Coordinates,
  transactions: Transaction[],
  requestedPropertyType?: string,
  requestedArea?: number,
  requestedDistrict?: string
): {
  pricePerSqm: number;
  count: number;
  confidence: number;
  nearbyCount: number;
} | null {
  // ── الصفقات ذات الإحداثيات ───────────────────────────────────────────────
  const withCoords = transactions.filter((t) => t.lat != null && t.lng != null);

  if (withCoords.length === 0 && transactions.length === 0) return null;

  // ── حساب الأوزان ─────────────────────────────────────────────────────────
  type Weighted = { ppsm: number; w: number; distKm: number };
  const weighted: Weighted[] = [];

  for (const t of withCoords) {
    const distKm = haversineDistance(coords, { lat: t.lat!, lng: t.lng! });

    // 1. وزن المسافة (عكسي تربيعي)
    const wDist = 1 / Math.max(distKm, 0.05) ** 2;

    // 2. وزن نوع العقار (أساسي: 2.0 تطابق، 0.5 اختلاف)
    const wType =
      requestedPropertyType && requestedPropertyType !== "غير محدد"
        ? t.propertyType === requestedPropertyType ? 2.0 : 0.5
        : 1.0;

    // 3. وزن الحي مع مطابقة تقريبية (exact=1.8، fuzzy=1.4، none=0.9)
    const districtMatch = requestedDistrict
      ? matchDistrict(requestedDistrict, t.district)
      : "none";
    const wDistrict =
      districtMatch === "exact" ? 1.8 :
      districtMatch === "fuzzy" ? 1.4 :
      requestedDistrict ? 0.9 : 1.0;

    // 4. وزن تشابه المساحة
    let wArea = 1.0;
    if (requestedArea && requestedArea > 0) {
      const ratio =
        Math.abs(t.area - requestedArea) / Math.max(t.area, requestedArea);
      wArea = Math.max(0.5, 1 - ratio * 0.5);
    }

    // 5. وزن الحداثة
    const wRecency = recencyWeight(t.date);

    const totalW = wDist * wType * wDistrict * wArea * wRecency;
    weighted.push({ ppsm: t.pricePerSqm, w: totalW, distKm });
  }

  // ── صفقات بدون إحداثيات: الوزن يعتمد على (الحي + النوع) معاً ─────────────
  const withoutCoords = transactions.filter((t) => t.lat == null || t.lng == null);
  for (const t of withoutCoords) {
    const wRecency = recencyWeight(t.date);

    const hasDistrictFilter = !!requestedDistrict;
    const hasTypeFilter = !!(requestedPropertyType && requestedPropertyType !== "غير محدد");
    const dm = hasDistrictFilter ? matchDistrict(requestedDistrict!, t.district) : "none";
    // تطابق الحي: exact أو fuzzy يُعامَلان كـ"نفس الحي"
    const districtMatches = dm === "exact" || dm === "fuzzy";
    const sameType = hasTypeFilter && t.propertyType === requestedPropertyType;

    // وزن الحي التقريبي: exact=أعلى، fuzzy=أقل قليلاً
    const districtBaseMultiplier = dm === "exact" ? 1.0 : dm === "fuzzy" ? 0.85 : 0;

    let baseW: number;
    if (hasDistrictFilter && hasTypeFilter) {
      if (districtMatches && sameType)   baseW = (dm === "exact" ? 6.0 : 5.0); // ← الأساسي
      else if (districtMatches)          baseW = dm === "exact" ? 1.0 : 0.85;
      else if (sameType)                 baseW = 0.8;
      else                               baseW = 0.1;
    } else if (hasDistrictFilter) {
      baseW = districtMatches ? (2.0 * districtBaseMultiplier || 1.7) : 0.3;
    } else if (hasTypeFilter) {
      baseW = sameType ? 1.0 : 0.4;
    } else {
      baseW = 0.5;
    }

    weighted.push({ ppsm: t.pricePerSqm, w: baseW * wRecency, distKm: Infinity });
  }

  if (weighted.length === 0) return null;

  const totalW = weighted.reduce((s, x) => s + x.w, 0);
  const pricePerSqm = weighted.reduce((s, x) => s + x.ppsm * x.w, 0) / totalW;

  // ── حساب الثقة ───────────────────────────────────────────────────────────
  const nearbyCount = withCoords.filter((_, i) => weighted[i]?.distKm <= 20).length;
  const veryNearCount = withCoords.filter((_, i) => weighted[i]?.distKm <= 5).length;

  // تباين الأسعار في المنطقة القريبة (انحراف معياري)
  const nearbyPrices = weighted
    .filter((x) => x.distKm <= 20)
    .map((x) => x.ppsm);
  let variancePenalty = 0;
  if (nearbyPrices.length > 1) {
    const avg = nearbyPrices.reduce((s, p) => s + p, 0) / nearbyPrices.length;
    const stdDev = Math.sqrt(
      nearbyPrices.reduce((s, p) => s + (p - avg) ** 2, 0) / nearbyPrices.length
    );
    const cv = stdDev / avg; // معامل الاختلاف
    variancePenalty = Math.min(20, cv * 40);
  }

  const rawConfidence =
    30 +
    Math.min(30, veryNearCount * 10) +
    Math.min(20, nearbyCount * 3) +
    Math.min(20, withoutCoords.length * 2) -
    variancePenalty;

  const confidence = Math.round(Math.max(30, Math.min(98, rawConfidence)));

  return {
    pricePerSqm,
    count: transactions.length,
    confidence,
    nearbyCount,
  };
}

// ── أقرب نقطة اهتمام ──────────────────────────────────────────────────────────
function findNearestItem<T extends { lat: number; lng: number }>(
  coords: Coordinates,
  items: T[]
): (T & { distKm: number }) | null {
  if (!items || items.length === 0) return null;
  let best: (T & { distKm: number }) | null = null;
  for (const item of items) {
    const distKm = haversineDistance(coords, { lat: item.lat, lng: item.lng });
    if (!best || distKm < best.distKm) {
      best = { ...item, distKm };
    }
  }
  return best;
}

function buildRouteUrl(from: Coordinates, to: { lat: number; lng: number }): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat},${from.lng};${to.lat},${to.lng}`;
}

// ── الدالة الرئيسية ───────────────────────────────────────────────────────────
export function estimatePrice(
  coords: Coordinates,
  transactions: Transaction[] = [],
  requestedPropertyType?: string,
  requestedArea?: number,
  metroStations?: MetroStation[],
  stadiums?: Stadium[],
  requestedDistrict?: string
): PriceEstimate {
  const { city, distFromCenter } = detectCity(coords);

  let cityName: string;
  let locationScore: number;
  let areaClassification: string;
  const scoreBreakdown: ScoreBreakdown = { metro: 0, geography: 0, market: 0.5 };

  // ── الموقع الجغرافي (0–2 نقطة) ────────────────────────────────────────────
  if (city) {
    const centerFactor = Math.max(0.6, 1 - (distFromCenter / city.radius) * 0.4);
    cityName = city.name;
    scoreBreakdown.geography = Math.round(Math.min(2.0, centerFactor * 2.0) * 10) / 10;
  } else {
    cityName = "منطقة أخرى";
    scoreBreakdown.geography = 0.5;
  }

  // ── محطة المترو (0–3 نقاط) ────────────────────────────────────────────────
  let nearestMetro: NearestMetro | undefined;

  if (metroStations && metroStations.length > 0) {
    const nearest = findNearestItem(coords, metroStations);
    if (nearest) {
      const d = nearest.distKm;
      scoreBreakdown.metro =
        d <= 0.5 ? 3.0 :
        d <= 1.0 ? 2.5 :
        d <= 2.0 ? 1.5 :
        d <= 5.0 ? 0.7 : 0;

      nearestMetro = {
        nameAr: nearest.nameAr,
        lineNameAr: nearest.lineNameAr,
        lineColor: nearest.lineColor,
        distKm: Math.round(nearest.distKm * 100) / 100,
        routeUrl: buildRouteUrl(coords, nearest),
      };
    }
  }

  // درجة أساسية = جغرافي + مترو + سوق (يُحدَّث السوق لاحقاً إن توفرت بيانات)
  // الخدمات والمرافق (0–4) تُضاف client-side من بيانات Overpass
  const computeBaseScore = () =>
    Math.round((scoreBreakdown.geography + scoreBreakdown.metro + scoreBreakdown.market) * 10) / 10;

  locationScore = computeBaseScore();

  // اجعل metroBonus متوافقاً مع الإصدار السابق
  const metroBonus = scoreBreakdown.metro;

  // ── أقرب استاد ────────────────────────────────────────────────────────────
  let nearestStadium: NearestStadium | undefined;

  if (stadiums && stadiums.length > 0) {
    // تصفية الاستادات بالمدينة أولاً، وإلا أقرب استاد على الإطلاق
    const cityStadiums = stadiums.filter((s) => s.city === cityName);
    const pool = cityStadiums.length > 0 ? cityStadiums : stadiums;
    const nearest = findNearestItem(coords, pool);
    if (nearest) {
      nearestStadium = {
        nameAr: nearest.nameAr,
        city: nearest.city,
        teams: nearest.teams,
        distKm: Math.round(nearest.distKm * 100) / 100,
        routeUrl: buildRouteUrl(coords, nearest),
      };
    }
  }

  // ── تصفية الصفقات بالمدينة (مع تطبيع الاسم) ─────────────────────────────
  const normalCityName = normalizeCityName(cityName);
  const cityTx = transactions
    .filter((t) => normalizeCityName(t.city) === normalCityName)
    // تصفية الأسعار الخاطئة (إيجارات مخزّنة كأسعار بيع أو بيانات غير صحيحة)
    .filter((t) => t.pricePerSqm >= 300 && t.pricePerSqm <= 100000);

  // ── تصنيف المنطقة: سعر المتر الفعلي (أولوية) أو الموقع الجغرافي (احتياطي) ──
  //
  // إذا توفرت صفقات كافية للحي المطلوب نحسب نسبة سعره للمتوسط:
  //   نسبة ≥ 1.30 → راقية    (الحي أغلى 30%+ من المتوسط)
  //   نسبة ≥ 1.10 → جيدة
  //   نسبة ≥ 0.85 → متوسطة
  //   نسبة < 0.85 → نائية / شعبية
  //
  // الدرجة النهائية = 70% سعر + 30% موقع (لتعزيز الدقة وتقليل أثر الموقع الجغرافي)
  {
    const hasCityData = cityTx.length >= 3;
    let usedPriceRatio = false;

    if (requestedDistrict && hasCityData) {
      const districtTx = cityTx.filter(
        (t) => matchDistrict(requestedDistrict, t.district) !== "none"
      );

      if (districtTx.length >= 2) {
        const districtAvg =
          districtTx.reduce((s, t) => s + t.pricePerSqm, 0) / districtTx.length;
        const cityAvg =
          cityTx.reduce((s, t) => s + t.pricePerSqm, 0) / cityTx.length;
        const ratio = districtAvg / cityAvg;

        // ── السوق العقاري (0–1 نقطة) ────────────────────────────────────────
        scoreBreakdown.market =
          ratio >= 1.5 ? 1.0  :
          ratio >= 1.3 ? 0.9  :
          ratio >= 1.1 ? 0.75 :
          ratio >= 0.9 ? 0.6  :
          ratio >= 0.7 ? 0.4  : 0.25;

        locationScore = computeBaseScore();
        usedPriceRatio = true;
      }
    }

    // تصنيف لغوي: يأخذ في الحسبان أن الدرجة الكاملة = base(0–6) + خدمات(0–4)
    // نفترض متوسط خدمات = 2 للحصول على تقدير أولي قبل تحميل Overpass
    const estimatedFull = Math.min(10, locationScore + 2);
    if (estimatedFull >= 8)      areaClassification = "منطقة راقية";
    else if (estimatedFull >= 6) areaClassification = "منطقة جيدة";
    else if (estimatedFull >= 4) areaClassification = "منطقة متوسطة";
    else                         areaClassification = "منطقة نائية";

    void usedPriceRatio;
  }

  const real = estimatePriceFromTransactions(
    coords,
    cityTx,
    requestedPropertyType,
    requestedArea,
    requestedDistrict
  );

  if (real) {
    const { pricePerSqm, count, confidence, nearbyCount } = real;

    // نطاق السعر: يُستخرج من صفقات نفس النوع في المدينة (أدق من استخدام الكل)
    const sameTxPool = (requestedPropertyType && requestedPropertyType !== "غير محدد")
      ? cityTx.filter((t) => t.propertyType === requestedPropertyType)
      : cityTx;
    const poolPrices = sameTxPool.map((t) => t.pricePerSqm);
    const poolAvg = poolPrices.length > 0
      ? poolPrices.reduce((s, p) => s + p, 0) / poolPrices.length
      : pricePerSqm;
    const stdDev =
      poolPrices.length > 1
        ? Math.sqrt(poolPrices.reduce((s, p) => s + (p - poolAvg) ** 2, 0) / poolPrices.length)
        : pricePerSqm * 0.15;

    // النطاق: ±انحراف معياري، بحد أدنى 10% من السعر
    const spread = Math.max(stdDev * 0.5, pricePerSqm * 0.1);

    // الإيجار: عائد سنوي 7% ÷ 12 شهر
    const refArea = requestedArea ?? 150;
    const annualYield = 0.07;
    const monthlyRent = Math.round(pricePerSqm * refArea * (annualYield / 12));

    return {
      pricePerSqmSale: Math.round(pricePerSqm),
      monthlyRent,
      priceRangeMin: Math.round(Math.max(pricePerSqm - spread, pricePerSqm * 0.7)),
      priceRangeMax: Math.round(pricePerSqm + spread),
      locationScore,
      scoreBreakdown,
      metroBonus: metroBonus > 0 ? metroBonus : undefined,
      cityName,
      areaClassification,
      dataSource: "real",
      transactionCount: count,
      confidence,
      nearbyCount,
      nearestMetro,
      nearestStadium,
    };
  }

  // ── محاكاة إحصائية عند غياب البيانات الحقيقية ────────────────────────────
  let baseSale: number;
  let baseRent: number;
  if (city) {
    const centerFactor = Math.max(0.6, 1 - (distFromCenter / city.radius) * 0.4);
    baseSale = city.basePriceSale * centerFactor;
    baseRent = city.baseRent * centerFactor;
  } else {
    baseSale = 1500;
    baseRent = 8000;
  }

  const rand = seededRandom(coords.lat, coords.lng);
  const rf = 0.88 + rand * 0.24;
  const sale = Math.round(baseSale * rf);
  const refArea = requestedArea ?? 150;
  const rent = Math.round((baseRent * rf * refArea) / 150);

  return {
    pricePerSqmSale: sale,
    monthlyRent: rent,
    priceRangeMin: Math.round(sale * 0.8),
    priceRangeMax: Math.round(sale * 1.2),
    locationScore,
    scoreBreakdown,
    metroBonus: metroBonus > 0 ? metroBonus : undefined,
    cityName,
    areaClassification,
    dataSource: "simulation",
    nearestMetro,
    nearestStadium,
  };
}

// backward-compat alias
export const simulatePrice = (coords: Coordinates) => estimatePrice(coords, []);
