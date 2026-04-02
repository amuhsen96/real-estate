import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

function latLngToTileXY(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function latLngToPixel(lat: number, lng: number, originX: number, originY: number, zoom: number, tileSize = 256) {
  const n = Math.pow(2, zoom);
  const xTile = ((lng + 180) / 360) * n;
  const yTile =
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  return {
    px: Math.round((xTile - originX) * tileSize),
    py: Math.round((yTile - originY) * tileSize),
  };
}

async function fetchTile(x: number, y: number, zoom: number): Promise<Buffer | null> {
  try {
    const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RealEstateApp/1.0 (property location viewer)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function markerSVG(color: string, label: string, size = 28): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="${size / 2}" y="${size / 2 + 5}" font-size="${size * 0.45}" text-anchor="middle"
            fill="white" font-family="Arial" font-weight="bold">${label}</text>
      <line x1="${size / 2}" y1="${size - 2}" x2="${size / 2}" y2="${size + 8}"
            stroke="${color}" stroke-width="2"/>
    </svg>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
  }

  const ZOOM = 17;
  const GRID = 3;
  const TILE_SIZE = 256;
  const OUTPUT_W = GRID * TILE_SIZE;
  const OUTPUT_H = GRID * TILE_SIZE;

  const center = latLngToTileXY(lat, lng, ZOOM);
  const originX = center.x - Math.floor(GRID / 2);
  const originY = center.y - Math.floor(GRID / 2);

  const tilePromises: Promise<Buffer | null>[] = [];
  for (let dy = 0; dy < GRID; dy++)
    for (let dx = 0; dx < GRID; dx++)
      tilePromises.push(fetchTile(originX + dx, originY + dy, ZOOM));

  const tiles = await Promise.all(tilePromises);

  const composites: sharp.OverlayOptions[] = [];
  for (let dy = 0; dy < GRID; dy++) {
    for (let dx = 0; dx < GRID; dx++) {
      const tile = tiles[dy * GRID + dx];
      if (tile) {
        composites.push({ input: tile, top: dy * TILE_SIZE, left: dx * TILE_SIZE });
      }
    }
  }

  if (composites.length === 0) {
    const fallback = await sharp({
      create: { width: OUTPUT_W, height: OUTPUT_H, channels: 3, background: { r: 220, g: 220, b: 220 } },
    }).png().toBuffer();
    return new NextResponse(fallback as unknown as BodyInit, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  }

  const base = sharp({
    create: { width: OUTPUT_W, height: OUTPUT_H, channels: 4, background: { r: 230, g: 230, b: 230, alpha: 1 } },
  }).composite(composites);

  const prop = latLngToPixel(lat, lng, originX, originY, ZOOM);
  const markerSize = 28;
  const clampedPx = Math.max(0, Math.min(OUTPUT_W - markerSize, prop.px - markerSize / 2));
  const clampedPy = Math.max(0, Math.min(OUTPUT_H - markerSize - 8, prop.py - markerSize));

  const finalBuffer = await base
    .composite([{
      input: Buffer.from(markerSVG("#dc2626", "P", markerSize)),
      top: clampedPy,
      left: clampedPx,
      blend: "over",
    }])
    .png({ compressionLevel: 6 })
    .toBuffer();

  return new NextResponse(finalBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
