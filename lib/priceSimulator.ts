import type { Coordinates } from "./parseGoogleMapsUrl";

export interface PriceEstimate {
  pricePerSqmSale: number;     // سعر المتر المربع (بيع) بالريال
  monthlyRent: number;         // الإيجار الشهري التقديري (شقة 150م²)
  priceRangeMin: number;       // الحد الأدنى للسعر/م²
  priceRangeMax: number;       // الحد الأعلى للسعر/م²
  locationScore: number;       // مؤشر جودة الموقع (1-10)
  cityName: string;            // اسم المدينة
  areaClassification: string;  // تصنيف المنطقة
}

// بيانات المدن الرئيسية (سعر المتر المربع بالريال)
const CITY_DATA = [
  { name: "الرياض",         center: { lat: 24.7136, lng: 46.6753 }, radius: 60, basePriceSale: 5500, baseRent: 35000 },
  { name: "جدة",            center: { lat: 21.4858, lng: 39.1925 }, radius: 40, basePriceSale: 5000, baseRent: 30000 },
  { name: "مكة المكرمة",   center: { lat: 21.3891, lng: 39.8579 }, radius: 25, basePriceSale: 6000, baseRent: 32000 },
  { name: "المدينة المنورة", center: { lat: 24.4539, lng: 39.6142 }, radius: 25, basePriceSale: 4500, baseRent: 25000 },
  { name: "الدمام",         center: { lat: 26.3927, lng: 49.9777 }, radius: 30, basePriceSale: 4000, baseRent: 22000 },
  { name: "الخبر",          center: { lat: 26.2172, lng: 50.1971 }, radius: 20, basePriceSale: 4500, baseRent: 25000 },
  { name: "الظهران",        center: { lat: 26.2361, lng: 50.0393 }, radius: 15, basePriceSale: 4200, baseRent: 23000 },
  { name: "تبوك",           center: { lat: 28.3998, lng: 36.5715 }, radius: 20, basePriceSale: 2500, baseRent: 15000 },
  { name: "أبها",           center: { lat: 18.2164, lng: 42.5053 }, radius: 15, basePriceSale: 2800, baseRent: 16000 },
  { name: "بريدة",          center: { lat: 26.3260, lng: 43.9750 }, radius: 15, basePriceSale: 2200, baseRent: 14000 },
  { name: "نجران",          center: { lat: 17.4933, lng: 44.1277 }, radius: 15, basePriceSale: 2000, baseRent: 12000 },
  { name: "حائل",           center: { lat: 27.5219, lng: 41.6907 }, radius: 15, basePriceSale: 2100, baseRent: 13000 },
];

function haversineDistance(a: Coordinates, b: Coordinates): number {
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

function seededRandom(lat: number, lng: number): number {
  const x = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function estimatePrice(coords: Coordinates): PriceEstimate {
  // إيجاد أقرب مدينة
  let city = null;
  let minDist = Infinity;
  for (const c of CITY_DATA) {
    const dist = haversineDistance(coords, c.center);
    if (dist < c.radius && dist < minDist) {
      city = c;
      minDist = dist;
    }
  }

  let baseSale: number;
  let baseRent: number;
  let cityName: string;
  let locationScore: number;

  if (city) {
    const centerFactor = Math.max(0.6, 1 - (minDist / city.radius) * 0.4);
    baseSale = city.basePriceSale * centerFactor;
    baseRent = city.baseRent * centerFactor;
    cityName = city.name;
    // مؤشر الموقع: أعلى كلما اقتربنا من المركز
    locationScore = Math.round((5 + centerFactor * 5) * 10) / 10;
  } else {
    baseSale = 1500;
    baseRent = 8000;
    cityName = "منطقة أخرى";
    locationScore = 3;
  }

  // تباين بسيط مرتبط بالإحداثيات (ثابت لنفس الموقع)
  const rand = seededRandom(coords.lat, coords.lng);
  const randomFactor = 0.88 + rand * 0.24; // ±12%

  const adjustedSale = Math.round(baseSale * randomFactor);
  const adjustedRent = Math.round(baseRent * randomFactor);

  let areaClassification: string;
  if (locationScore >= 8) areaClassification = "منطقة راقية";
  else if (locationScore >= 6) areaClassification = "منطقة جيدة";
  else if (locationScore >= 4) areaClassification = "منطقة متوسطة";
  else areaClassification = "منطقة نائية";

  return {
    pricePerSqmSale: adjustedSale,
    monthlyRent: adjustedRent,
    priceRangeMin: Math.round(adjustedSale * 0.80),
    priceRangeMax: Math.round(adjustedSale * 1.20),
    locationScore: Math.min(10, locationScore),
    cityName,
    areaClassification,
  };
}

// الدالة القديمة للتوافق مع أي مكان يستخدمها
export const simulatePrice = (coords: Coordinates) => estimatePrice(coords);
