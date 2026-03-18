import { NextRequest, NextResponse } from "next/server";

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  village?: string;
  city?: string;
  town?: string;
  county?: string;
  state?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
  display_name?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { lat, lng } = await request.json();

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json&accept-language=ar`;

    const res = await fetch(url, {
      headers: { "User-Agent": "RealEstateApp/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ district: null, city: null });
    }

    const data: NominatimResponse = await res.json();
    const addr = data.address ?? {};

    // الحي: suburb > neighbourhood > quarter > village
    const district =
      addr.suburb ??
      addr.neighbourhood ??
      addr.quarter ??
      addr.village ??
      null;

    // المدينة: city > town > county
    const city = addr.city ?? addr.town ?? addr.county ?? null;

    return NextResponse.json({ district, city });
  } catch {
    // إذا فشل الطلب (شبكة، timeout) → إعادة null بهدوء
    return NextResponse.json({ district: null, city: null });
  }
}
