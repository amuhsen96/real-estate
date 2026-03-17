import type { Coordinates } from "./parseGoogleMapsUrl";

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
  cityName: string;
  areaClassification: string;
  dataSource: "real" | "simulation";
  transactionCount?: number;
}

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

// ── estimate using real transaction data ─────────────────────────────────────
function estimatePriceFromTransactions(
  coords: Coordinates,
  cityName: string,
  transactions: Transaction[]
): { pricePerSqm: number; count: number } | null {
  const cityTx = transactions.filter((t) => t.city === cityName);
  if (cityTx.length === 0) return null;

  const withCoords = cityTx.filter((t) => t.lat != null && t.lng != null);

  if (withCoords.length >= 2) {
    // Weighted average by inverse distance
    const weighted = withCoords.map((t) => {
      const dist = haversineDistance(coords, { lat: t.lat!, lng: t.lng! });
      return { ppsm: t.pricePerSqm, w: 1 / Math.max(dist, 0.05) };
    });
    const totalW = weighted.reduce((s, x) => s + x.w, 0);
    const pricePerSqm = weighted.reduce((s, x) => s + x.ppsm * x.w, 0) / totalW;
    return { pricePerSqm, count: withCoords.length };
  }

  // Simple city average
  const avg = cityTx.reduce((s, t) => s + t.pricePerSqm, 0) / cityTx.length;
  return { pricePerSqm: avg, count: cityTx.length };
}

// ── main export ──────────────────────────────────────────────────────────────
export function estimatePrice(
  coords: Coordinates,
  transactions: Transaction[] = []
): PriceEstimate {
  const { city, distFromCenter } = detectCity(coords);

  // Location context (score + city name)
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

  if (locationScore >= 8) areaClassification = "منطقة راقية";
  else if (locationScore >= 6) areaClassification = "منطقة جيدة";
  else if (locationScore >= 4) areaClassification = "منطقة متوسطة";
  else areaClassification = "منطقة نائية";

  // ── Try real data first ───────────────────────────────────────────────────
  const real = estimatePriceFromTransactions(coords, cityName, transactions);
  if (real) {
    const { pricePerSqm, count } = real;

    // Price range: use std dev of city transactions (min ±10%)
    const cityPrices = transactions
      .filter((t) => t.city === cityName)
      .map((t) => t.pricePerSqm);
    const avg = cityPrices.reduce((s, p) => s + p, 0) / cityPrices.length;
    const stdDev =
      cityPrices.length > 1
        ? Math.sqrt(
            cityPrices.reduce((s, p) => s + (p - avg) ** 2, 0) / cityPrices.length
          )
        : avg * 0.15;

    const spread = Math.max(stdDev, pricePerSqm * 0.1);

    return {
      pricePerSqmSale: Math.round(pricePerSqm),
      monthlyRent: Math.round(pricePerSqm * 150 * 0.006), // عائد إيجاري ~7.2% سنوياً
      priceRangeMin: Math.round(Math.max(pricePerSqm - spread, pricePerSqm * 0.7)),
      priceRangeMax: Math.round(pricePerSqm + spread),
      locationScore,
      cityName,
      areaClassification,
      dataSource: "real",
      transactionCount: count,
    };
  }

  // ── Simulation fallback ───────────────────────────────────────────────────
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
  const rent = Math.round(baseRent * rf);

  return {
    pricePerSqmSale: sale,
    monthlyRent: rent,
    priceRangeMin: Math.round(sale * 0.8),
    priceRangeMax: Math.round(sale * 1.2),
    locationScore,
    cityName,
    areaClassification,
    dataSource: "simulation",
  };
}

// backward-compat alias
export const simulatePrice = (coords: Coordinates) => estimatePrice(coords, []);
