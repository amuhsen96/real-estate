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
  }[];
}

const CATEGORIES = [
  {
    id: "restaurant",
    ar: "مطاعم وكافيهات",
    icon: "🍽️",
    query: `node["amenity"~"^(restaurant|cafe)$"](around:RADIUS,LAT,LNG);`,
  },
  {
    id: "shopping_mall",
    ar: "مراكز تجارية",
    icon: "🛍️",
    query: `(node["shop"="mall"](around:RADIUS,LAT,LNG);way["shop"="mall"](around:RADIUS,LAT,LNG);way["building"="retail"](around:RADIUS,LAT,LNG););`,
  },
  {
    id: "school",
    ar: "مدارس وجامعات",
    icon: "🎓",
    query: `(node["amenity"~"^(school|university|college)$"](around:RADIUS,LAT,LNG);way["amenity"~"^(school|university|college)$"](around:RADIUS,LAT,LNG););`,
  },
  {
    id: "hospital",
    ar: "مستشفيات وعيادات",
    icon: "🏥",
    query: `(node["amenity"~"^(hospital|clinic|doctors)$"](around:RADIUS,LAT,LNG);way["amenity"~"^(hospital|clinic|doctors)$"](around:RADIUS,LAT,LNG););`,
  },
  {
    id: "place_of_worship",
    ar: "مساجد",
    icon: "🕌",
    query: `(node["amenity"="place_of_worship"]["religion"="muslim"](around:RADIUS,LAT,LNG);way["amenity"="place_of_worship"]["religion"="muslim"](around:RADIUS,LAT,LNG););`,
  },
  {
    id: "park",
    ar: "حدائق ومتنزهات",
    icon: "🌳",
    query: `(node["leisure"="park"](around:RADIUS,LAT,LNG);way["leisure"="park"](around:RADIUS,LAT,LNG););`,
  },
  {
    id: "bank",
    ar: "بنوك وصرافات",
    icon: "🏦",
    query: `node["amenity"~"^(bank|atm)$"](around:RADIUS,LAT,LNG);`,
  },
  {
    id: "gas_station",
    ar: "محطات وقود",
    icon: "⛽",
    query: `node["amenity"="fuel"](around:RADIUS,LAT,LNG);`,
  },
  {
    id: "supermarket",
    ar: "سوبرماركت",
    icon: "🛒",
    query: `(node["shop"="supermarket"](around:RADIUS,LAT,LNG);node["shop"="grocery"](around:RADIUS,LAT,LNG););`,
  },
  {
    id: "pharmacy",
    ar: "صيدليات",
    icon: "💊",
    query: `node["amenity"="pharmacy"](around:RADIUS,LAT,LNG);`,
  },
];

const MAX_RADIUS = 5000;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

async function searchCategory(
  lat: number,
  lng: number,
  cat: (typeof CATEGORIES)[0]
): Promise<CategoryResult> {
  const rawQuery = cat.query
    .replace(/RADIUS/g, String(MAX_RADIUS))
    .replace(/LAT/g, String(lat))
    .replace(/LNG/g, String(lng));

  const overpassQuery = `[out:json][timeout:15];${rawQuery}out center 20;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return { category: cat.id, categoryAr: cat.ar, icon: cat.icon, places: [] };
    }

    const data: { elements: OverpassElement[] } = await res.json();

    const places = (data.elements ?? [])
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        const name = el.tags?.["name:ar"] ?? el.tags?.["name"] ?? "";
        const distance = elLat != null && elLng != null
          ? calcDistance(lat, lng, elLat, elLng)
          : null;
        return { name, vicinity: el.tags?.["addr:street"] ?? "", rating: null, distance };
      })
      .filter((p) => p.name)
      .sort((a, b) => (a.distance ?? MAX_RADIUS) - (b.distance ?? MAX_RADIUS))
      .slice(0, 20);

    return { category: cat.id, categoryAr: cat.ar, icon: cat.icon, places };
  } catch {
    return { category: cat.id, categoryAr: cat.ar, icon: cat.icon, places: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    const results = await Promise.all(
      CATEGORIES.map((cat) => searchCategory(lat, lng, cat))
    );

    const summary = {
      restaurants: results.find((r) => r.category === "restaurant")?.places.length ?? 0,
      schools:     results.find((r) => r.category === "school")?.places.length ?? 0,
      hospitals:   results.find((r) => r.category === "hospital")?.places.length ?? 0,
      malls:       results.find((r) => r.category === "shopping_mall")?.places.length ?? 0,
      mosques:     results.find((r) => r.category === "place_of_worship")?.places.length ?? 0,
      parks:       results.find((r) => r.category === "park")?.places.length ?? 0,
      banks:       results.find((r) => r.category === "bank")?.places.length ?? 0,
    };

    return NextResponse.json({ categories: results, summary });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث عن الأنشطة المحيطة" },
      { status: 500 }
    );
  }
}
