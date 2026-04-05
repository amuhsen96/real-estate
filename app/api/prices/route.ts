import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { estimatePrice } from "@/lib/priceSimulator";
import type { Transaction, MetroStation, Stadium } from "@/lib/priceSimulator";
import pool, { rowToTransaction } from "@/lib/db";

function loadMetroStations(): MetroStation[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "metro-stations.json"), "utf-8"));
  } catch {
    return [];
  }
}

function loadStadiums(): Stadium[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "stadiums.json"), "utf-8"));
  } catch {
    return [];
  }
}

/** اكتشاف المدينة والحي عبر Nominatim (timeout 4 ثواني) */
async function detectLocation(lat: number, lng: number): Promise<{ city: string | null; district: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RealEstateApp/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { city: null, district: null };
    const data = await res.json();
    const addr = data.address ?? {};
    const city =
      addr.city ?? addr.town ?? addr.municipality ?? addr.county ?? null;
    const district =
      addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.village ?? null;
    return { city, district };
  } catch {
    return { city: null, district: null };
  }
}

/** جلب صفقات مدينة معينة من MySQL */
async function loadTransactionsByCity(city: string): Promise<Transaction[]> {
  const table = process.env.DB_TABLE ?? "aqar";
  const [rows] = await pool.query(
    `SELECT ad_no, city, district, property_type, area, price, deal_type, region, data_date, source
     FROM \`${table}\`
     WHERE city LIKE ? AND (price + 0) > 0 AND (area + 0) > 0`,
    [`%${city}%`]
  );
  return (rows as Record<string, unknown>[]).map(rowToTransaction);
}

/** fallback: جلب أقرب 2000 صفقة بدون فلتر مدينة */
async function loadTransactionsFallback(): Promise<Transaction[]> {
  const table = process.env.DB_TABLE ?? "aqar";
  const [rows] = await pool.query(
    `SELECT ad_no, city, district, property_type, area, price, deal_type, region, data_date, source
     FROM \`${table}\`
     WHERE (price + 0) > 0 AND (area + 0) > 0
     ORDER BY data_date DESC
     LIMIT 2000`
  );
  return (rows as Record<string, unknown>[]).map(rowToTransaction);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, propertyType, area, district: userDistrict } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    // اكتشاف المدينة والحي من Nominatim بالتوازي مع تحميل metro/stadium
    const [location, metroStations, stadiums] = await Promise.all([
      detectLocation(lat, lng),
      Promise.resolve(loadMetroStations()),
      Promise.resolve(loadStadiums()),
    ]);

    const detectedDistrict = (userDistrict as string | undefined) ?? location.district;

    // جلب صفقات المدينة المكتشفة فقط — fallback لـ 2000 صفقة عامة إن لم تُكتشف المدينة
    let transactions: Transaction[] = [];
    if (location.city) {
      transactions = await loadTransactionsByCity(location.city);
    }
    if (transactions.length === 0) {
      transactions = await loadTransactionsFallback();
    }

    const estimate = estimatePrice(
      { lat, lng },
      transactions,
      propertyType ?? undefined,
      area ? Number(area) : undefined,
      metroStations,
      stadiums,
      detectedDistrict ?? undefined
    );
    return NextResponse.json({ ...estimate, detectedDistrict });
  } catch {
    return NextResponse.json({ error: "حدث خطأ أثناء حساب الأسعار" }, { status: 500 });
  }
}
