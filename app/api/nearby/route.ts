import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CategoryResult {
  category: string;
  categoryAr: string;
  icon: string;
  places: {
    name: string;
    vicinity: string;
    rating: number | null;
    distance: number | null;
    lat?: number;
    lng?: number;
  }[];
}

// تعريف كل فئة مع الـ tags المقابلة في OSM
const CATEGORIES = [
  { id: "restaurant",       ar: "مطاعم وكافيهات",      icon: "🍽️" },
  { id: "shopping_mall",    ar: "مراكز تجارية",          icon: "🛍️" },
  { id: "school",           ar: "مدارس وجامعات",         icon: "🎓" },
  { id: "hospital",         ar: "مستشفيات وعيادات",      icon: "🏥" },
  { id: "place_of_worship", ar: "مساجد",                 icon: "🕌" },
  { id: "park",             ar: "حدائق ومتنزهات",        icon: "🌳" },
  { id: "bank",             ar: "بنوك وصرافات",          icon: "🏦" },
  { id: "gas_station",      ar: "محطات وقود",            icon: "⛽" },
  { id: "supermarket",      ar: "سوبرماركت",             icon: "🛒" },
  { id: "pharmacy",         ar: "صيدليات",               icon: "💊" },
];

// ربط كلمات البحث في Apify بمعرّفات الفئات
const APIFY_CATEGORY_MAP: { query: string; id: string }[] = [
  { query: "مطاعم وكافيهات",   id: "restaurant" },
  { query: "مراكز تجارية",     id: "shopping_mall" },
  { query: "مدارس وجامعات",    id: "school" },
  { query: "مستشفيات وعيادات", id: "hospital" },
  { query: "مساجد",             id: "place_of_worship" },
  { query: "حدائق ومتنزهات",   id: "park" },
  { query: "بنوك وصرافات",     id: "bank" },
  { query: "محطات وقود",       id: "gas_station" },
  { query: "سوبرماركت",         id: "supermarket" },
  { query: "صيدليات",           id: "pharmacy" },
];

const MAX_RADIUS = 5000;
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Overpass ────────────────────────────────────────────────────────────────

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildUnifiedQuery(lat: number, lng: number, radius: number): string {
  const R = radius;
  const L = lat;
  const G = lng;
  return `[out:json][timeout:25];
(
  node["amenity"~"^(restaurant|cafe)$"](around:${R},${L},${G});
  node["shop"="mall"](around:${R},${L},${G});
  way["shop"="mall"](around:${R},${L},${G});
  way["building"="retail"](around:${R},${L},${G});
  node["amenity"~"^(school|university|college)$"](around:${R},${L},${G});
  way["amenity"~"^(school|university|college)$"](around:${R},${L},${G});
  node["amenity"~"^(hospital|clinic|doctors)$"](around:${R},${L},${G});
  way["amenity"~"^(hospital|clinic|doctors)$"](around:${R},${L},${G});
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${R},${L},${G});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${R},${L},${G});
  node["leisure"="park"](around:${R},${L},${G});
  way["leisure"="park"](around:${R},${L},${G});
  node["amenity"~"^(bank|atm)$"](around:${R},${L},${G});
  node["amenity"="fuel"](around:${R},${L},${G});
  node["shop"~"^(supermarket|grocery)$"](around:${R},${L},${G});
  node["amenity"="pharmacy"](around:${R},${L},${G});
);
out center 300;`;
}

function classifyElement(tags: Record<string, string>): string | null {
  const amenity  = tags["amenity"]  ?? "";
  const shop     = tags["shop"]     ?? "";
  const leisure  = tags["leisure"]  ?? "";
  const building = tags["building"] ?? "";
  const religion = tags["religion"] ?? "";

  if (amenity === "restaurant" || amenity === "cafe") return "restaurant";
  if (shop === "mall" || building === "retail")        return "shopping_mall";
  if (amenity === "school" || amenity === "university" || amenity === "college") return "school";
  if (amenity === "hospital" || amenity === "clinic" || amenity === "doctors")   return "hospital";
  if (amenity === "place_of_worship" && religion === "muslim") return "place_of_worship";
  if (leisure === "park")   return "park";
  if (amenity === "bank" || amenity === "atm") return "bank";
  if (amenity === "fuel")   return "gas_station";
  if (shop === "supermarket" || shop === "grocery") return "supermarket";
  if (amenity === "pharmacy") return "pharmacy";
  return null;
}

async function tryMirror(url: string, query: string): Promise<{ elements: OverpassElement[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  if (!text.trim().startsWith("{")) throw new Error("non-JSON response");
  const data = JSON.parse(text);
  if (!Array.isArray(data?.elements)) throw new Error("invalid structure");
  return data;
}

async function fetchOverpass(query: string): Promise<{ elements: OverpassElement[] } | null> {
  try {
    return await Promise.any(OVERPASS_URLS.map((url) => tryMirror(url, query)));
  } catch {
    return null;
  }
}

function processOverpassData(
  data: { elements: OverpassElement[] } | null,
  lat: number,
  lng: number
): CategoryResult[] {
  const buckets = new Map<string, CategoryResult["places"]>(
    CATEGORIES.map((c) => [c.id, []])
  );

  for (const el of data?.elements ?? []) {
    if (!el.tags) continue;
    const catId = classifyElement(el.tags);
    if (!catId) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon  ?? el.center?.lon;
    const name  = el.tags["name:ar"] ?? el.tags["name"] ?? "";
    if (!name) continue;

    const distance =
      elLat != null && elLng != null
        ? calcDistance(lat, lng, elLat, elLng)
        : null;

    buckets.get(catId)?.push({
      name,
      vicinity: el.tags["addr:street"] ?? "",
      rating: null,
      distance,
      ...(elLat != null && elLng != null ? { lat: elLat, lng: elLng } : {}),
    });
  }

  return CATEGORIES.map((cat) => ({
    category:   cat.id,
    categoryAr: cat.ar,
    icon:       cat.icon,
    places: (buckets.get(cat.id) ?? [])
      .sort((a, b) => (a.distance ?? MAX_RADIUS) - (b.distance ?? MAX_RADIUS))
      .slice(0, 20),
  }));
}

// ─── Apify ────────────────────────────────────────────────────────────────────

interface ApifyPlace {
  title?: string;
  categoryName?: string;
  address?: string;
  location?: { lat: number; lng: number };
  totalScore?: number;
  searchString?: string;
}

async function fetchFromApify(lat: number, lng: number): Promise<CategoryResult[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN غير مضبوط في .env.local");

  const searchStringsArray = APIFY_CATEGORY_MAP.map(
    (c) => `${c.query} بالقرب من ${lat},${lng}`
  );

  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=90`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray,
        maxCrawledPlacesPerSearch: 10,
        maxImages: 0,
        language: "ar",
        includeHistogram: false,
        includeOpeningHours: false,
        includePeopleAlsosearch: false,
      }),
      signal: AbortSignal.timeout(95000),
    }
  );

  if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${await res.text()}`);
  const items: ApifyPlace[] = await res.json();

  const buckets = new Map<string, CategoryResult["places"]>(
    CATEGORIES.map((c) => [c.id, []])
  );

  for (const item of items) {
    if (!item.searchString) continue;
    const catEntry = APIFY_CATEGORY_MAP.find((c) =>
      item.searchString!.startsWith(c.query)
    );
    if (!catEntry) continue;
    const name = item.title ?? "";
    if (!name) continue;

    const loc = item.location;
    const distance =
      loc?.lat != null && loc?.lng != null
        ? calcDistance(lat, lng, loc.lat, loc.lng)
        : null;

    buckets.get(catEntry.id)?.push({
      name,
      vicinity: item.address ?? "",
      rating: item.totalScore ?? null,
      distance,
      ...(loc ? { lat: loc.lat, lng: loc.lng } : {}),
    });
  }

  return CATEGORIES.map((cat) => ({
    category:   cat.id,
    categoryAr: cat.ar,
    icon:       cat.icon,
    places: (buckets.get(cat.id) ?? [])
      .sort((a, b) => (a.distance ?? MAX_RADIUS) - (b.distance ?? MAX_RADIUS))
      .slice(0, 20),
  }));
}

// ─── بناء ملخص الفئات ─────────────────────────────────────────────────────────

function buildSummary(results: CategoryResult[]) {
  return {
    restaurants: results.find((r) => r.category === "restaurant")?.places.length    ?? 0,
    schools:     results.find((r) => r.category === "school")?.places.length         ?? 0,
    hospitals:   results.find((r) => r.category === "hospital")?.places.length       ?? 0,
    malls:       results.find((r) => r.category === "shopping_mall")?.places.length  ?? 0,
    mosques:     results.find((r) => r.category === "place_of_worship")?.places.length ?? 0,
    parks:       results.find((r) => r.category === "park")?.places.length           ?? 0,
    banks:       results.find((r) => r.category === "bank")?.places.length           ?? 0,
  };
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, provider = "overpass" } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    if (provider === "apify") {
      if (!process.env.APIFY_API_TOKEN) {
        return NextResponse.json(
          { error: "APIFY_API_TOKEN غير مضبوط — أضفه في .env.local على السيرفر" },
          { status: 503 }
        );
      }
      const results = await fetchFromApify(lat, lng);
      return NextResponse.json({ categories: results, summary: buildSummary(results), provider: "apify" });
    }

    // Overpass (default)
    const query = buildUnifiedQuery(lat, lng, MAX_RADIUS);
    const data  = await fetchOverpass(query);
    const results = processOverpassData(data, lat, lng);
    return NextResponse.json({ categories: results, summary: buildSummary(results), provider: "overpass" });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "حدث خطأ أثناء البحث عن الأنشطة المحيطة";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
