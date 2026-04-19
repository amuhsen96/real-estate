import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface DistrictRow {
  district: string;
  cnt: number;
  avg_sqm: number;
  lat?: number;
  lng?: number;
}

// Cache geocoding in memory for the lifetime of the server process
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function tryNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&limit=1&format=json&countrycodes=sa`,
      {
        headers: { "User-Agent": "RealEstateHeatmap/1.0" },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

async function geocodeDistrict(district: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${district}__${city}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;

  // Try multiple query formats — Nominatim often needs different phrasing for Arabic districts
  const queries = [
    `حي ${district}، ${city}، السعودية`,
    `${district}، ${city}، السعودية`,
    `${district} ${city} Saudi Arabia`,
    `حي ${district} ${city}`,
  ];

  for (const q of queries) {
    const result = await tryNominatim(q);
    if (result) {
      geocodeCache.set(cacheKey, result);
      return result;
    }
    await delay(120);
  }

  geocodeCache.set(cacheKey, null);
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
              ROUND(AVG((price + 0) / NULLIF((area + 0), 0))) AS avg_sqm
       FROM \`${table}\`
       WHERE city LIKE ?
         AND district IS NOT NULL AND district != ''
         AND (price + 0) > 0 AND (area + 0) > 0 AND (area + 0) < 50000
         AND (? = '' OR deal_type = ?)
       GROUP BY district
       HAVING cnt >= 5
       ORDER BY cnt DESC
       LIMIT 30`,
      [`%${city}%`, dealType, dealType],
    );
    const districts = rows as DistrictRow[];

    if (districts.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Geocode — sequential to respect Nominatim rate limit
    const geocoded: DistrictRow[] = [];
    for (const row of districts) {
      const coords = await geocodeDistrict(row.district, city);
      if (coords) {
        geocoded.push({ ...row, lat: coords.lat, lng: coords.lng });
      }
      await delay(120);
    }

    // Return geocoded rows + all rows (for table fallback in UI)
    return NextResponse.json({ data: geocoded, all: districts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
