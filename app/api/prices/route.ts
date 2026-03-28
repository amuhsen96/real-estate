import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { estimatePrice } from "@/lib/priceSimulator";
import type { Transaction, MetroStation, Stadium } from "@/lib/priceSimulator";

function loadTransactions(): Transaction[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "transactions.json"), "utf-8"));
  } catch {
    return [];
  }
}

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

/** اكتشاف الحي عبر Nominatim (مع timeout 4 ثواني) */
async function detectDistrict(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RealEstateApp/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    return addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.village ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, propertyType, area, district: userDistrict } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    // إذا أدخل المستخدم الحي يدوياً، نستخدمه مباشرة ولا نحتاج Nominatim
    const [transactions, metroStations, stadiums, nominatimDistrict] = await Promise.all([
      Promise.resolve(loadTransactions()),
      Promise.resolve(loadMetroStations()),
      Promise.resolve(loadStadiums()),
      userDistrict ? Promise.resolve(null) : detectDistrict(lat, lng),
    ]);

    const detectedDistrict = (userDistrict as string | undefined) ?? nominatimDistrict;

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
