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

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** استعلام واحد يجلب كل الفئات دفعة واحدة */
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

/** تصنيف عنصر OSM إلى فئة */
function classifyElement(tags: Record<string, string>): string | null {
  const amenity = tags["amenity"] ?? "";
  const shop    = tags["shop"]    ?? "";
  const leisure = tags["leisure"] ?? "";
  const building = tags["building"] ?? "";
  const religion = tags["religion"] ?? "";

  if (amenity === "restaurant" || amenity === "cafe") return "restaurant";
  if (shop === "mall" || building === "retail")         return "shopping_mall";
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

async function fetchOverpass(query: string): Promise<{ elements: OverpassElement[] } | null> {
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(28000),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("json")) continue;
      return await res.json();
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    // ── طلب واحد لكل الفئات ──────────────────────────────────────────────────
    const query = buildUnifiedQuery(lat, lng, MAX_RADIUS);
    const data  = await fetchOverpass(query);

    // تجميع النتائج في خريطة categoryId → places[]
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

      const distance = elLat != null && elLng != null
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

    // ترتيب كل فئة حسب المسافة
    const results: CategoryResult[] = CATEGORIES.map((cat) => ({
      category:   cat.id,
      categoryAr: cat.ar,
      icon:       cat.icon,
      places: (buckets.get(cat.id) ?? [])
        .sort((a, b) => (a.distance ?? MAX_RADIUS) - (b.distance ?? MAX_RADIUS))
        .slice(0, 20),
    }));

    const summary = {
      restaurants: results.find((r) => r.category === "restaurant")?.places.length    ?? 0,
      schools:     results.find((r) => r.category === "school")?.places.length         ?? 0,
      hospitals:   results.find((r) => r.category === "hospital")?.places.length       ?? 0,
      malls:       results.find((r) => r.category === "shopping_mall")?.places.length  ?? 0,
      mosques:     results.find((r) => r.category === "place_of_worship")?.places.length ?? 0,
      parks:       results.find((r) => r.category === "park")?.places.length           ?? 0,
      banks:       results.find((r) => r.category === "bank")?.places.length           ?? 0,
    };

    return NextResponse.json({ categories: results, summary });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث عن الأنشطة المحيطة" },
      { status: 500 }
    );
  }
}
