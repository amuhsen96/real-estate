import { NextRequest, NextResponse } from "next/server";

interface PlaceResult {
  name: string;
  vicinity?: string;
  rating?: number;
  types?: string[];
  geometry?: {
    location: { lat: number; lng: number };
  };
}

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
  { type: "restaurant", keyword: null, ar: "مطاعم وكافيهات", icon: "🍽️" },
  { type: "shopping_mall", keyword: null, ar: "مراكز تجارية", icon: "🛍️" },
  { type: "school", keyword: null, ar: "مدارس وجامعات", icon: "🎓" },
  { type: "hospital", keyword: null, ar: "مستشفيات وصيدليات", icon: "🏥" },
  { type: "place_of_worship", keyword: "mosque", ar: "مساجد", icon: "🕌" },
  { type: "park", keyword: null, ar: "حدائق ومتنزهات", icon: "🌳" },
  { type: "bank", keyword: null, ar: "بنوك", icon: "🏦" },
  { type: "gas_station", keyword: null, ar: "محطات وقود", icon: "⛽" },
  { type: "supermarket", keyword: null, ar: "سوبرماركت", icon: "🛒" },
  { type: "pharmacy", keyword: null, ar: "صيدليات", icon: "💊" },
];

// Search at max radius; UI handles zoom filtering by distance
const MAX_RADIUS = 5000;

function calcDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

async function searchNearby(
  lat: number,
  lng: number,
  type: string,
  keyword: string | null,
  apiKey: string
): Promise<PlaceResult[]> {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${MAX_RADIUS}&type=${type}&language=ar&key=${apiKey}`;
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(
        `Places API error for type=${type}: ${data.status}`,
        data.error_message ?? ""
      );
    }
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: "lat و lng مطلوبان" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      return NextResponse.json(
        { error: "لم يتم تعيين مفتاح Google Maps API" },
        { status: 500 }
      );
    }

    // Fetch all categories in parallel at max radius
    const results = await Promise.all(
      CATEGORIES.map(async (cat) => {
        const places = await searchNearby(lat, lng, cat.type, cat.keyword, apiKey);
        return {
          category: cat.type,
          categoryAr: cat.ar,
          icon: cat.icon,
          places: places
            .map((p: PlaceResult) => ({
              name: p.name,
              vicinity: p.vicinity ?? "",
              rating: p.rating ?? null,
              distance: p.geometry
                ? calcDistance(
                    lat,
                    lng,
                    p.geometry.location.lat,
                    p.geometry.location.lng
                  )
                : null,
            }))
            .sort(
              (a, b) => (a.distance ?? MAX_RADIUS) - (b.distance ?? MAX_RADIUS)
            )
            .slice(0, 20),
        } satisfies CategoryResult;
      })
    );

    // Summary counts for price simulation (use full 5km results)
    const summary = {
      restaurants:
        results.find((r) => r.category === "restaurant")?.places.length ?? 0,
      schools:
        results.find((r) => r.category === "school")?.places.length ?? 0,
      hospitals:
        results.find((r) => r.category === "hospital")?.places.length ?? 0,
      malls:
        results.find((r) => r.category === "shopping_mall")?.places.length ?? 0,
      mosques:
        results.find((r) => r.category === "place_of_worship")?.places.length ?? 0,
      parks: results.find((r) => r.category === "park")?.places.length ?? 0,
      banks: results.find((r) => r.category === "bank")?.places.length ?? 0,
    };

    return NextResponse.json({ categories: results, summary });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث عن الأنشطة المحيطة" },
      { status: 500 }
    );
  }
}
