import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

const TABLE = process.env.DB_TABLE ?? "aqar";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return values.filter((v) => v >= lo && v <= hi);
}

export interface GroupStats {
  count: number;
  medianPricePerSqm: number;
  avgPricePerSqm: number;
  p25PricePerSqm: number;
  p75PricePerSqm: number;
  minPrice: number;
  maxPrice: number;
  medianArea: number;
}

export interface AnalyzeResult {
  totalTransactions: number;
  byCity: Record<string, GroupStats & { byDistrict: Record<string, GroupStats> }>;
  byPropertyType: Record<string, GroupStats>;
  byDealType: Record<string, GroupStats>;
  byRegion: Record<string, GroupStats>;
}

interface RawRow {
  city: string;
  district: string;
  property_type: string;
  deal_type: string;
  region: string;
  area: number;
  price: number;
}

function computeStats(rows: RawRow[]): GroupStats {
  const rawPpsm = rows.map((r) => {
    const a = Number(r.area);
    const p = Number(r.price);
    return a > 0 ? Math.round(p / a) : 0;
  }).filter((v) => v > 0);

  const ppsm = removeOutliers(rawPpsm);
  const prices = rows.map((r) => Number(r.price));
  const areas = rows.map((r) => Number(r.area));

  return {
    count: rows.length,
    medianPricePerSqm: Math.round(median(ppsm)),
    avgPricePerSqm: ppsm.length > 0 ? Math.round(ppsm.reduce((s, v) => s + v, 0) / ppsm.length) : 0,
    p25PricePerSqm: Math.round(percentile(ppsm, 25)),
    p75PricePerSqm: Math.round(percentile(ppsm, 75)),
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    medianArea: Math.round(median(areas)),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filterCity = searchParams.get("city");
  const filterRegion = searchParams.get("region");
  const filterDealType = searchParams.get("dealType");
  const filterPropertyType = searchParams.get("propertyType");

  // بناء جملة WHERE ديناميكياً
  const conditions: string[] = ["price > 0", "area > 0"];
  const params: unknown[] = [];

  if (filterCity) { conditions.push("city = ?"); params.push(filterCity); }
  if (filterRegion) { conditions.push("region = ?"); params.push(filterRegion); }
  if (filterDealType) { conditions.push("deal_type = ?"); params.push(filterDealType); }
  if (filterPropertyType) { conditions.push("property_type = ?"); params.push(filterPropertyType); }

  const where = conditions.join(" AND ");

  const [rows] = await pool.query(
    `SELECT city, district, property_type, deal_type, region, area, price
     FROM \`${TABLE}\`
     WHERE ${where}`,
    params
  );

  const data = rows as RawRow[];

  // إجمالي الصفقات
  const totalTransactions = data.length;

  // تجميع حسب المدينة
  const cityMap = new Map<string, RawRow[]>();
  for (const row of data) {
    const key = row.city || "غير محدد";
    if (!cityMap.has(key)) cityMap.set(key, []);
    cityMap.get(key)!.push(row);
  }

  const byCity: AnalyzeResult["byCity"] = {};
  for (const [city, cityRows] of cityMap) {
    const districtMap = new Map<string, RawRow[]>();
    for (const row of cityRows) {
      const key = row.district || "غير محدد";
      if (!districtMap.has(key)) districtMap.set(key, []);
      districtMap.get(key)!.push(row);
    }
    const byDistrict: Record<string, GroupStats> = {};
    for (const [district, dRows] of districtMap) {
      byDistrict[district] = computeStats(dRows);
    }
    byCity[city] = { ...computeStats(cityRows), byDistrict };
  }

  // تجميع حسب نوع العقار
  const propMap = new Map<string, RawRow[]>();
  for (const row of data) {
    const key = row.property_type || "غير محدد";
    if (!propMap.has(key)) propMap.set(key, []);
    propMap.get(key)!.push(row);
  }
  const byPropertyType: Record<string, GroupStats> = {};
  for (const [k, v] of propMap) byPropertyType[k] = computeStats(v);

  // تجميع حسب نوع الصفقة
  const dealMap = new Map<string, RawRow[]>();
  for (const row of data) {
    const key = row.deal_type || "غير محدد";
    if (!dealMap.has(key)) dealMap.set(key, []);
    dealMap.get(key)!.push(row);
  }
  const byDealType: Record<string, GroupStats> = {};
  for (const [k, v] of dealMap) byDealType[k] = computeStats(v);

  // تجميع حسب المنطقة
  const regionMap = new Map<string, RawRow[]>();
  for (const row of data) {
    const key = row.region || "غير محدد";
    if (!regionMap.has(key)) regionMap.set(key, []);
    regionMap.get(key)!.push(row);
  }
  const byRegion: Record<string, GroupStats> = {};
  for (const [k, v] of regionMap) byRegion[k] = computeStats(v);

  const result: AnalyzeResult = {
    totalTransactions,
    byCity,
    byPropertyType,
    byDealType,
    byRegion,
  };

  return NextResponse.json(result);
}
