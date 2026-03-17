import type { Coordinates } from "./parseGoogleMapsUrl";

export interface NearbyPlaceSummary {
  restaurants: number;
  schools: number;
  hospitals: number;
  malls: number;
  mosques: number;
  parks: number;
  banks: number;
}

export interface PriceEstimate {
  pricePerSqmSale: number;       // سعر المتر المربع (بيع) بالريال
  monthlyRent: number;           // الإيجار الشهري التقديري (شقة 150م²)
  priceRangeMin: number;         // الحد الأدنى للسعر/م²
  priceRangeMax: number;         // الحد الأعلى للسعر/م²
  locationScore: number;         // مؤشر جودة الموقع (1-10)
  cityName: string;              // اسم المدينة التقديري
  areaClassification: string;    // تصنيف المنطقة
}

// Major Saudi cities with base pricing data (SAR/m²)
const CITY_DATA: {
  name: string;
  center: Coordinates;
  radius: number; // km
  basePriceSale: number;
  baseRent: number; // monthly for 150m²
}[] = [
  { name: "الرياض", center: { lat: 24.7136, lng: 46.6753 }, radius: 60, basePriceSale: 5500, baseRent: 35000 },
  { name: "جدة", center: { lat: 21.4858, lng: 39.1925 }, radius: 40, basePriceSale: 5000, baseRent: 30000 },
  { name: "مكة المكرمة", center: { lat: 21.3891, lng: 39.8579 }, radius: 25, basePriceSale: 6000, baseRent: 32000 },
  { name: "المدينة المنورة", center: { lat: 24.4539, lng: 39.6142 }, radius: 25, basePriceSale: 4500, baseRent: 25000 },
  { name: "الدمام", center: { lat: 26.3927, lng: 49.9777 }, radius: 30, basePriceSale: 4000, baseRent: 22000 },
  { name: "الخبر", center: { lat: 26.2172, lng: 50.1971 }, radius: 20, basePriceSale: 4500, baseRent: 25000 },
  { name: "الظهران", center: { lat: 26.2361, lng: 50.0393 }, radius: 15, basePriceSale: 4200, baseRent: 23000 },
  { name: "تبوك", center: { lat: 28.3998, lng: 36.5715 }, radius: 20, basePriceSale: 2500, baseRent: 15000 },
  { name: "أبها", center: { lat: 18.2164, lng: 42.5053 }, radius: 15, basePriceSale: 2800, baseRent: 16000 },
  { name: "بريدة", center: { lat: 26.3260, lng: 43.9750 }, radius: 15, basePriceSale: 2200, baseRent: 14000 },
  { name: "نجران", center: { lat: 17.4933, lng: 44.1277 }, radius: 15, basePriceSale: 2000, baseRent: 12000 },
  { name: "حائل", center: { lat: 27.5219, lng: 41.6907 }, radius: 15, basePriceSale: 2100, baseRent: 13000 },
];

function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function detectCity(coords: Coordinates): (typeof CITY_DATA)[0] | null {
  let closest = null;
  let minDist = Infinity;

  for (const city of CITY_DATA) {
    const dist = haversineDistance(coords, city.center);
    if (dist < city.radius && dist < minDist) {
      closest = city;
      minDist = dist;
    }
  }

  return closest;
}

function seededRandom(lat: number, lng: number): number {
  // Deterministic pseudo-random based on coordinates
  const x = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function simulatePrice(
  coords: Coordinates,
  nearby: NearbyPlaceSummary
): PriceEstimate {
  const city = detectCity(coords);
  const rand = seededRandom(coords.lat, coords.lng);

  let baseSale: number;
  let baseRent: number;
  let cityName: string;

  if (city) {
    const distFromCenter = haversineDistance(coords, city.center);
    const centerFactor = Math.max(0.6, 1 - distFromCenter / city.radius * 0.4);
    baseSale = city.basePriceSale * centerFactor;
    baseRent = city.baseRent * centerFactor;
    cityName = city.name;
  } else {
    // Outside known cities - rural/remote area
    baseSale = 1500;
    baseRent = 8000;
    cityName = "منطقة أخرى";
  }

  // Amenity adjustments
  let amenityFactor = 1.0;
  amenityFactor += Math.min(nearby.malls, 5) * 0.03;         // +3% per mall (max 5)
  amenityFactor += Math.min(nearby.hospitals, 3) * 0.04;     // +4% per hospital (max 3)
  amenityFactor += Math.min(nearby.schools, 5) * 0.02;       // +2% per school (max 5)
  amenityFactor += Math.min(nearby.restaurants, 10) * 0.005; // +0.5% per restaurant (max 10)
  amenityFactor += Math.min(nearby.mosques, 3) * 0.015;      // +1.5% per mosque (max 3)
  amenityFactor += Math.min(nearby.parks, 3) * 0.025;        // +2.5% per park (max 3)
  amenityFactor += Math.min(nearby.banks, 3) * 0.01;         // +1% per bank (max 3)

  // Add seeded random variation ±12%
  const randomFactor = 0.88 + rand * 0.24;

  const adjustedSale = Math.round(baseSale * amenityFactor * randomFactor);
  const adjustedRent = Math.round(baseRent * amenityFactor * randomFactor);

  // Price range ±20%
  const rangeMin = Math.round(adjustedSale * 0.80);
  const rangeMax = Math.round(adjustedSale * 1.20);

  // Location score (1-10) based on amenity diversity and count
  const totalAmenities =
    nearby.restaurants + nearby.schools + nearby.hospitals +
    nearby.malls + nearby.mosques + nearby.parks + nearby.banks;
  const diversityBonus = [
    nearby.restaurants > 0, nearby.schools > 0, nearby.hospitals > 0,
    nearby.malls > 0, nearby.mosques > 0, nearby.parks > 0, nearby.banks > 0
  ].filter(Boolean).length;

  const rawScore = Math.min(10, 2 + diversityBonus + Math.min(totalAmenities, 20) * 0.15);
  const locationScore = Math.round(rawScore * 10) / 10;

  // Area classification
  let areaClassification: string;
  if (locationScore >= 8) areaClassification = "منطقة راقية - خدمات متكاملة";
  else if (locationScore >= 6) areaClassification = "منطقة جيدة - خدمات متنوعة";
  else if (locationScore >= 4) areaClassification = "منطقة متوسطة - خدمات محدودة";
  else areaClassification = "منطقة نائية - خدمات قليلة";

  return {
    pricePerSqmSale: adjustedSale,
    monthlyRent: adjustedRent,
    priceRangeMin: rangeMin,
    priceRangeMax: rangeMax,
    locationScore,
    cityName,
    areaClassification,
  };
}
