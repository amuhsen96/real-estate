import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import type { Transaction } from "@/lib/priceSimulator";

export const dynamic = "force-dynamic";

const DB_PATH = join(process.cwd(), "data", "transactions.json");

function loadTransactions(): Transaction[] {
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

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

// إزالة الشواذ باستخدام IQR
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

function computeStats(txs: Transaction[]): GroupStats {
  const ppsm = removeOutliers(txs.map((t) => t.pricePerSqm));
  const prices = txs.map((t) => t.price);
  const areas = txs.map((t) => t.area);
  return {
    count: txs.length,
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

  let transactions = loadTransactions();

  // تطبيق الفلاتر المطلوبة
  if (filterCity) transactions = transactions.filter((t) => t.city === filterCity);
  if (filterRegion) transactions = transactions.filter((t) => t.region === filterRegion);
  if (filterDealType) transactions = transactions.filter((t) => t.dealType === filterDealType);
  if (filterPropertyType) transactions = transactions.filter((t) => t.propertyType === filterPropertyType);

  // تجميع حسب المدينة
  const cityMap = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.city || "غير محدد";
    if (!cityMap.has(key)) cityMap.set(key, []);
    cityMap.get(key)!.push(tx);
  }

  const byCity: AnalyzeResult["byCity"] = {};
  for (const [city, cityTxs] of cityMap) {
    // تجميع حسب الحي داخل المدينة
    const districtMap = new Map<string, Transaction[]>();
    for (const tx of cityTxs) {
      const key = tx.district || "غير محدد";
      if (!districtMap.has(key)) districtMap.set(key, []);
      districtMap.get(key)!.push(tx);
    }

    const byDistrict: Record<string, GroupStats> = {};
    for (const [district, dTxs] of districtMap) {
      byDistrict[district] = computeStats(dTxs);
    }

    byCity[city] = { ...computeStats(cityTxs), byDistrict };
  }

  // تجميع حسب نوع العقار
  const propMap = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.propertyType || "غير محدد";
    if (!propMap.has(key)) propMap.set(key, []);
    propMap.get(key)!.push(tx);
  }
  const byPropertyType: Record<string, GroupStats> = {};
  for (const [k, v] of propMap) byPropertyType[k] = computeStats(v);

  // تجميع حسب نوع الصفقة
  const dealMap = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.dealType || "غير محدد";
    if (!dealMap.has(key)) dealMap.set(key, []);
    dealMap.get(key)!.push(tx);
  }
  const byDealType: Record<string, GroupStats> = {};
  for (const [k, v] of dealMap) byDealType[k] = computeStats(v);

  // تجميع حسب المنطقة الإدارية
  const regionMap = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.region || "غير محدد";
    if (!regionMap.has(key)) regionMap.set(key, []);
    regionMap.get(key)!.push(tx);
  }
  const byRegion: Record<string, GroupStats> = {};
  for (const [k, v] of regionMap) byRegion[k] = computeStats(v);

  const result: AnalyzeResult = {
    totalTransactions: transactions.length,
    byCity,
    byPropertyType,
    byDealType,
    byRegion,
  };

  return NextResponse.json(result);
}
