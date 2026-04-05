import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { estimatePrice, detectCityNameFromCoords } from "@/lib/priceSimulator";
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
    const city     = addr.city ?? addr.town ?? addr.municipality ?? addr.county ?? null;
    const district = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.village ?? null;
    return { city, district };
  } catch {
    return { city: null, district: null };
  }
}

/** جلب صفقات مدينة معينة من MySQL — يُعيد [] عند أي خطأ */
async function loadTransactionsByCity(city: string): Promise<Transaction[]> {
  try {
    const table = process.env.DB_TABLE ?? "aqar";
    const [rows] = await pool.query(
      `SELECT ad_no, city, district, property_type, area, price, deal_type, region, data_date, source
       FROM \`${table}\`
       WHERE city LIKE ? AND (price + 0) > 0 AND (area + 0) > 0`,
      [`%${city}%`]
    );
    return (rows as Record<string, unknown>[]).map(rowToTransaction);
  } catch (err) {
    console.error("[prices] DB error (city query):", err instanceof Error ? err.message : err);
    return [];
  }
}

/** fallback: جلب أقرب 2000 صفقة بدون فلتر مدينة — يُعيد [] عند أي خطأ */
async function loadTransactionsFallback(): Promise<Transaction[]> {
  try {
    const table = process.env.DB_TABLE ?? "aqar";
    const [rows] = await pool.query(
      `SELECT ad_no, city, district, property_type, area, price, deal_type, region, data_date, source
       FROM \`${table}\`
       WHERE (price + 0) > 0 AND (area + 0) > 0
       ORDER BY data_date DESC
       LIMIT 2000`
    );
    return (rows as Record<string, unknown>[]).map(rowToTransaction);
  } catch (err) {
    console.error("[prices] DB error (fallback query):", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, propertyType, area, district: userDistrict } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    // اكتشاف الموقع + تحميل metro/stadium بالتوازي
    const [location, metroStations, stadiums] = await Promise.all([
      detectLocation(lat, lng),
      Promise.resolve(loadMetroStations()),
      Promise.resolve(loadStadiums()),
    ]);

    const detectedDistrict = (userDistrict as string | undefined) ?? location.district;

    // اكتشاف المدينة: Nominatim أولاً، ثم جغرافياً (CITY_DATA)
    const cityName = location.city ?? detectCityNameFromCoords(lat, lng);

    // جلب صفقات MySQL — أي فشل في DB لا يوقف باقي الحسابات
    let transactions: Transaction[] = [];
    if (cityName) {
      transactions = await loadTransactionsByCity(cityName);
    }
    if (transactions.length === 0) {
      transactions = await loadTransactionsFallback();
    }

    console.log(`[prices] lat=${lat} lng=${lng} city=${cityName} txLoaded=${transactions.length}`);

    const estimate = estimatePrice(
      { lat, lng },
      transactions,
      propertyType ?? undefined,
      area ? Number(area) : undefined,
      metroStations,
      stadiums,
      detectedDistrict ?? undefined
    );

    console.log(`[prices] dataSource=${estimate.dataSource} transactionCount=${estimate.transactionCount}`);

    return NextResponse.json({ ...estimate, detectedDistrict });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[prices] error:", msg);
    return NextResponse.json({ error: "حدث خطأ أثناء حساب الأسعار" }, { status: 500 });
  }
}
