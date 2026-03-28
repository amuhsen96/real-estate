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
  lat?: number;
  lng?: number;
  date?: string;
  source?: string;
}

export interface PriceEstimate {
  pricePerSqmSale: number;
  monthlyRent: number;
  priceRangeMin: number;
  priceRangeMax: number;
  locationScore: number;
  metroBonus?: number;      // مقدار الزيادة في الدرجة بسبب القرب من المترو
  cityName: string;
  areaClassification: string;
  dataSource: "real" | "simulation";
  transactionCount?: number;
  confidence?: number;      // 0–100 مستوى الثقة بالتقدير
  nearbyCount?: number;     // عدد الصفقات ضمن 20 كم (مع إحداثيات)
  nearestMetro?: NearestMetro;
  nearestStadium?: NearestStadium;
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
// المعايير المُستخدمة لكل صفقة:
//   1. المسافة الجغرافية  → وزن عكسي تربيعي (أقرب = أثقل)
//   2. تطابق نوع العقار   → مضاعف 1.5 عند التطابق
//   3. تشابه المساحة      → خصم حتى 30% عند التباين الكبير
//   4. حداثة الصفقة       → مضاعف من 0.85 إلى 1.4
//   5. تطابق الحي         → مضاعف 1.8 للصفقات ذات الإحداثيات (تعزيز إضافي)
//                           ووزن أساسي مرتفع 4× للصفقات بدون إحداثيات في نفس الحي
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

    // 2. وزن نوع العقار
    const wType =
      requestedPropertyType && requestedPropertyType !== "غير محدد"
        ? t.propertyType === requestedPropertyType
          ? 1.5
          : 0.7
        : 1.0;

    // 3. وزن تشابه المساحة
    let wArea = 1.0;
    if (requestedArea && requestedArea > 0) {
      const ratio =
        Math.abs(t.area - requestedArea) / Math.max(t.area, requestedArea);
      wArea = Math.max(0.5, 1 - ratio * 0.5);
    }

    // 4. وزن الحداثة
    const wRecency = recencyWeight(t.date);

    // 5. وزن الحي (تعزيز عند تطابق الحي مع إحداثيات معروفة)
    const wDistrict = (requestedDistrict && t.district === requestedDistrict) ? 1.8 : 1.0;

    const totalW = wDist * wType * wArea * wRecency * wDistrict;
    weighted.push({ ppsm: t.pricePerSqm, w: totalW, distKm });
  }

  // ── صفقات المدينة بدون إحداثيات ─────────────────────────────────────────
  // الوزن الأساسي يعتمد على تطابق الحي: صفقات نفس الحي تأخذ أولوية عالية
  const withoutCoords = transactions.filter((t) => t.lat == null || t.lng == null);
  for (const t of withoutCoords) {
    const wType =
      requestedPropertyType && requestedPropertyType !== "غير محدد"
        ? t.propertyType === requestedPropertyType ? 1.2 : 0.6
        : 1.0;
    const wRecency = recencyWeight(t.date);

    // الوزن الأساسي: عالٍ جداً إذا تطابق الحي، منخفض جداً إذا اختلف
    let baseW: number;
    if (requestedDistrict) {
      baseW = t.district === requestedDistrict ? 4.0 : 0.2;
    } else {
      baseW = 0.5; // fallback: وزن موحّد عند عدم معرفة الحي
    }

    weighted.push({ ppsm: t.pricePerSqm, w: baseW * wType * wRecency, distKm: Infinity });
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
  return `https://www.google.com/maps/dir/${from.lat},${from.lng}/${to.lat},${to.lng}`;
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

  if (city) {
    const centerFactor = Math.max(0.6, 1 - (distFromCenter / city.radius) * 0.4);
    cityName = city.name;
    locationScore = Math.round(Math.min(10, 5 + centerFactor * 5) * 10) / 10;
  } else {
    cityName = "منطقة أخرى";
    locationScore = 3;
  }

  // ── تأثير المترو على الموقع (الرياض فقط) ─────────────────────────────────
  let metroBonus = 0;
  let nearestMetro: NearestMetro | undefined;

  if (metroStations && metroStations.length > 0 && cityName === "الرياض") {
    const nearest = findNearestItem(coords, metroStations);
    if (nearest) {
      if (nearest.distKm <= 0.5)      metroBonus = 1.5;
      else if (nearest.distKm <= 1.0) metroBonus = 1.0;
      else if (nearest.distKm <= 2.0) metroBonus = 0.5;
      else if (nearest.distKm <= 5.0) metroBonus = 0.2;

      nearestMetro = {
        nameAr: nearest.nameAr,
        lineNameAr: nearest.lineNameAr,
        lineColor: nearest.lineColor,
        distKm: Math.round(nearest.distKm * 100) / 100,
        routeUrl: buildRouteUrl(coords, nearest),
      };
    }
  }

  if (metroBonus > 0) {
    locationScore = Math.round(Math.min(10, locationScore + metroBonus) * 10) / 10;
  }

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

  if (locationScore >= 8) areaClassification = "منطقة راقية";
  else if (locationScore >= 6) areaClassification = "منطقة جيدة";
  else if (locationScore >= 4) areaClassification = "منطقة متوسطة";
  else areaClassification = "منطقة نائية";

  // ── تصفية الصفقات بالمدينة أولاً ─────────────────────────────────────────
  const cityTx = transactions.filter((t) => t.city === cityName);

  const real = estimatePriceFromTransactions(
    coords,
    cityTx,
    requestedPropertyType,
    requestedArea,
    requestedDistrict
  );

  if (real) {
    const { pricePerSqm, count, confidence, nearbyCount } = real;

    // نطاق السعر بناءً على التباين الحقيقي في البيانات
    const cityPrices = cityTx.map((t) => t.pricePerSqm);
    const avg = cityPrices.reduce((s, p) => s + p, 0) / cityPrices.length;
    const stdDev =
      cityPrices.length > 1
        ? Math.sqrt(
            cityPrices.reduce((s, p) => s + (p - avg) ** 2, 0) / cityPrices.length
          )
        : avg * 0.15;

    const spread = Math.max(stdDev, pricePerSqm * 0.1);

    // الإيجار: يعتمد على المساحة المطلوبة أو 150م² كإفتراض
    const refArea = requestedArea ?? 150;
    const monthlyRent = Math.round(pricePerSqm * refArea * 0.006);

    return {
      pricePerSqmSale: Math.round(pricePerSqm),
      monthlyRent,
      priceRangeMin: Math.round(Math.max(pricePerSqm - spread, pricePerSqm * 0.7)),
      priceRangeMax: Math.round(pricePerSqm + spread),
      locationScore,
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
