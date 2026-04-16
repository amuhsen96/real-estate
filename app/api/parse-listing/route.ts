import { NextRequest, NextResponse } from "next/server";

interface ListingResult {
  title: string | null;
  price: number | null;
  area: number | null;
  lat: number | null;
  lng: number | null;
  propertyType: string | null;
  source: "aqar" | "bayut" | "unknown";
}

function detectSource(url: string): "aqar" | "bayut" | "unknown" {
  if (url.includes("aqar.fm") || url.includes("sa.aqar")) return "aqar";
  if (url.includes("bayut.com") || url.includes("bayut.sa")) return "bayut";
  return "unknown";
}

function extractNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.]/g, "")) : Number(val);
  return isNaN(n) || n <= 0 ? null : n;
}

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAqar(data: any): ListingResult {
  const prop =
    dig(data, "props", "pageProps", "property") ??
    dig(data, "props", "pageProps", "ad") ??
    dig(data, "props", "pageProps", "listing") ??
    null;

  const lat = extractNumber(dig(prop, "lat") ?? dig(prop, "latitude"));
  const lng = extractNumber(dig(prop, "lng") ?? dig(prop, "longitude"));
  const price = extractNumber(dig(prop, "price") ?? dig(prop, "totalPrice"));
  const area = extractNumber(dig(prop, "space") ?? dig(prop, "area") ?? dig(prop, "buildSpace"));
  const title = (dig(prop, "title") ?? dig(prop, "description") ?? null) as string | null;
  const propertyType = (dig(prop, "propertyType") ?? dig(prop, "type") ?? null) as string | null;

  return { title, price, area, lat, lng, propertyType, source: "aqar" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBayut(data: any): ListingResult {
  const prop =
    dig(data, "props", "pageProps", "propertyDetails") ??
    dig(data, "props", "pageProps", "property") ??
    null;

  const coords = dig(prop, "locationCoordinates") ?? dig(prop, "geography");
  const lat = extractNumber(dig(coords, "lat") ?? dig(prop, "latitude"));
  const lng = extractNumber(dig(coords, "lng") ?? dig(coords, "lon") ?? dig(prop, "longitude"));
  const price = extractNumber(dig(prop, "price") ?? dig(prop, "displayPrice"));
  const area = extractNumber(dig(prop, "area") ?? dig(prop, "builtUpArea"));
  const title = (dig(prop, "title") ?? dig(prop, "displayTitle") ?? null) as string | null;
  const propertyType = (dig(prop, "type") ?? dig(prop, "propertyType") ?? null) as string | null;

  return { title, price, area, lat, lng, propertyType, source: "bayut" };
}

function tryJsonLd(html: string): Partial<ListingResult> {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1]);
      const geo = obj.geo ?? obj.location?.geo ?? null;
      if (geo?.latitude && geo?.longitude) {
        return {
          lat: parseFloat(geo.latitude),
          lng: parseFloat(geo.longitude),
          price: extractNumber(obj.offers?.price ?? obj.price) ?? null,
          area: extractNumber(obj.floorSize?.value ?? obj.area) ?? null,
          title: obj.name ?? obj.title ?? null,
        };
      }
    } catch {}
  }
  return {};
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url مطلوب" }, { status: 400 });
    }

    const source = detectSource(url);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "ar,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `فشل تحميل الصفحة (${res.status})` }, { status: 422 });
    }

    const html = await res.text();

    // Try __NEXT_DATA__ first
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const result = source === "bayut" ? parseBayut(nextData) : parseAqar(nextData);
        if (result.lat && result.lng) {
          return NextResponse.json(result);
        }
        // Partially found — try to enrich from JSON-LD
        const fromLd = tryJsonLd(html);
        return NextResponse.json({ ...result, ...fromLd, source });
      } catch {}
    }

    // Fallback: JSON-LD
    const fromLd = tryJsonLd(html);
    if (fromLd.lat && fromLd.lng) {
      return NextResponse.json({ ...fromLd, source });
    }

    // Nothing found
    return NextResponse.json(
      { error: "تعذّر استخراج بيانات الإعلان. الموقع قد يمنع الوصول الآلي." },
      { status: 422 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
