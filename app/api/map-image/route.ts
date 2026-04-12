import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// ── حسابات OpenStreetMap tiles ──────────────────────────────────────────────
function latLngToTileXY(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/** الإحداثيات الجغرافية → pixel داخل grid الـ tiles */
function latLngToPixel(
  lat: number,
  lng: number,
  originX: number,
  originY: number,
  zoom: number,
  tileSize = 256
) {
  const n = Math.pow(2, zoom);
  const xTile = ((lng + 180) / 360) * n;
  const yTile =
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
    n;
  return {
    px: Math.round((xTile - originX) * tileSize),
    py: Math.round((yTile - originY) * tileSize),
  };
}

async function fetchTile(x: number, y: number, zoom: number): Promise<Buffer | null> {
  try {
    const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RealEstateApp/1.0 (property report generator)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** رسم دائرة SVG كـ overlay marker */
function markerSVG(color: string, label: string, size = 24): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="${size / 2}" y="${size / 2 + 5}" font-size="${size * 0.45}" text-anchor="middle"
            fill="white" font-family="Arial" font-weight="bold">${label}</text>
      <line x1="${size / 2}" y1="${size - 2}" x2="${size / 2}" y2="${size + 8}"
            stroke="${color}" stroke-width="2"/>
    </svg>`;
}

/** خط SVG بين نقطتين */
function lineSVG(
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  totalW: number,
  totalH: number
): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${color}" stroke-width="2" stroke-dasharray="6,4" opacity="0.8"/>
    </svg>`;
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lat = parseFloat(p.get("lat") ?? "");
  const lng = parseFloat(p.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat/lng مطلوبان" }, { status: 400 });
  }

  const metroLat = p.get("mlat") ? parseFloat(p.get("mlat")!) : null;
  const metroLng = p.get("mlng") ? parseFloat(p.get("mlng")!) : null;
  const stadLat = p.get("slat") ? parseFloat(p.get("slat")!) : null;
  const stadLng = p.get("slng") ? parseFloat(p.get("slng")!) : null;

  // ── Google Maps Static API (إذا كان المفتاح متوفراً) ───────────────────────
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  if (gmKey) {
    try {
      const gmUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
      gmUrl.searchParams.set("center", `${lat},${lng}`);
      gmUrl.searchParams.set("zoom", "14");
      gmUrl.searchParams.set("size", "768x400");
      gmUrl.searchParams.set("maptype", "roadmap");
      gmUrl.searchParams.set("language", "ar");
      // markers
      gmUrl.searchParams.append("markers", `color:red|label:P|${lat},${lng}`);
      if (metroLat && metroLng)
        gmUrl.searchParams.append("markers", `color:blue|label:M|${metroLat},${metroLng}`);
      if (stadLat && stadLng)
        gmUrl.searchParams.append("markers", `color:green|label:S|${stadLat},${stadLng}`);
      // path lines
      if (metroLat && metroLng)
        gmUrl.searchParams.append("path", `color:0x2563ebaa|weight:2|${lat},${lng}|${metroLat},${metroLng}`);
      if (stadLat && stadLng)
        gmUrl.searchParams.append("path", `color:0x16a34aaa|weight:2|${lat},${lng}|${stadLat},${stadLng}`);
      gmUrl.searchParams.set("key", gmKey);

      const gmRes = await fetch(gmUrl.toString(), { signal: AbortSignal.timeout(8000) });
      if (gmRes.ok) {
        const buf = Buffer.from(await gmRes.arrayBuffer());
        return new NextResponse(buf as unknown as BodyInit, {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
        });
      }
    } catch { /* fallback to OSM below */ }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const ZOOM = 14;
  const GRID = 3;          // 3×3 tiles
  const TILE_SIZE = 256;
  const OUTPUT_W = GRID * TILE_SIZE; // 768
  const OUTPUT_H = GRID * TILE_SIZE; // 768

  const center = latLngToTileXY(lat, lng, ZOOM);
  const originX = center.x - Math.floor(GRID / 2);
  const originY = center.y - Math.floor(GRID / 2);

  // جلب الـ 9 tiles بالتوازي
  const tilePromises: Promise<Buffer | null>[] = [];
  for (let dy = 0; dy < GRID; dy++)
    for (let dx = 0; dx < GRID; dx++)
      tilePromises.push(fetchTile(originX + dx, originY + dy, ZOOM));

  const tiles = await Promise.all(tilePromises);

  // بناء الصورة الأساسية
  const composites: sharp.OverlayOptions[] = [];
  for (let dy = 0; dy < GRID; dy++) {
    for (let dx = 0; dx < GRID; dx++) {
      const tile = tiles[dy * GRID + dx];
      if (tile) {
        composites.push({ input: tile, top: dy * TILE_SIZE, left: dx * TILE_SIZE });
      }
    }
  }

  // إذا لم تُحمَّل أي tile
  if (composites.length === 0) {
    const fallback = await sharp({
      create: { width: OUTPUT_W, height: OUTPUT_H, channels: 3, background: { r: 220, g: 220, b: 220 } },
    }).png().toBuffer();
    return new NextResponse(fallback as unknown as BodyInit, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
  }

  let base = sharp({
    create: { width: OUTPUT_W, height: OUTPUT_H, channels: 4, background: { r: 230, g: 230, b: 230, alpha: 1 } },
  }).composite(composites);

  const lineComposites: sharp.OverlayOptions[] = [];

  // حساب مواضع الـ markers بالـ pixels
  const prop = latLngToPixel(lat, lng, originX, originY, ZOOM);
  const metro = (metroLat && metroLng) ? latLngToPixel(metroLat, metroLng, originX, originY, ZOOM) : null;
  const stad = (stadLat && stadLng) ? latLngToPixel(stadLat, stadLng, originX, originY, ZOOM) : null;

  // رسم الخطوط (تحت المحددات)
  if (metro) {
    lineComposites.push({
      input: Buffer.from(lineSVG(prop.px, prop.py, metro.px, metro.py, "#2563eb", OUTPUT_W, OUTPUT_H)),
      top: 0, left: 0, blend: "over",
    });
  }
  if (stad) {
    lineComposites.push({
      input: Buffer.from(lineSVG(prop.px, prop.py, stad.px, stad.py, "#16a34a", OUTPUT_W, OUTPUT_H)),
      top: 0, left: 0, blend: "over",
    });
  }

  // رسم الـ markers
  const markerSize = 28;
  const addMarker = (px: number, py: number, color: string, label: string) => {
    const clampedPx = Math.max(0, Math.min(OUTPUT_W - markerSize, px - markerSize / 2));
    const clampedPy = Math.max(0, Math.min(OUTPUT_H - markerSize - 8, py - markerSize));
    lineComposites.push({
      input: Buffer.from(markerSVG(color, label, markerSize)),
      top: clampedPy, left: clampedPx, blend: "over",
    });
  };

  if (metro) addMarker(metro.px, metro.py, "#2563eb", "M");
  if (stad) addMarker(stad.px, stad.py, "#16a34a", "S");
  addMarker(prop.px, prop.py, "#dc2626", "P");  // العقار دائماً فوق

  const finalBuffer = await base
    .composite(lineComposites)
    .png({ compressionLevel: 6 })
    .toBuffer();

  return new NextResponse(finalBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
