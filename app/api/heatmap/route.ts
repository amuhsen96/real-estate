import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface DistrictRow {
  district: string;
  cnt: number;
  avg_sqm: number;
  lat?: number;
  lng?: number;
}

async function geocodeDistrict(district: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${district} ${city} المملكة العربية السعودية`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&limit=1&format=json&accept-language=ar`,
      {
        headers: { "User-Agent": "RealEstateHeatmap/1.0" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const dealType = searchParams.get("dealType") ?? "";

  if (!city) {
    return NextResponse.json({ error: "city مطلوب" }, { status: 400 });
  }

  try {
    const table = process.env.DB_TABLE ?? "aqar";

    const [rows] = await pool.query(
      `SELECT district,
              COUNT(*) AS cnt,
              ROUND(AVG(price / NULLIF(area, 0))) AS avg_sqm
       FROM \`${table}\`
       WHERE city = ?
         AND price > 0 AND area > 0 AND area < 50000
         AND (? = '' OR deal_type = ?)
         AND data_date >= DATE_SUB(CURDATE(), INTERVAL 3 YEAR)
       GROUP BY district
       HAVING cnt >= 10
       ORDER BY cnt DESC
       LIMIT 30`,
      [city, dealType, dealType],
    );
    const districts = rows as DistrictRow[];

    if (districts.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Geocode each district (sequential with delay to respect Nominatim rate limit)
    const geocoded: DistrictRow[] = [];
    for (const row of districts) {
      if (!row.district) continue;
      const coords = await geocodeDistrict(row.district, city);
      if (coords) {
        geocoded.push({ ...row, lat: coords.lat, lng: coords.lng });
      }
      await delay(150);
    }

    return NextResponse.json({ data: geocoded });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
