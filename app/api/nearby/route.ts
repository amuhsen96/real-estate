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
  }[];
}

const CATEGORIES = [
  { type: "restaurant", ar: "مطاعم وكافيهات", icon: "🍽️" },
  { type: "shopping_mall", ar: "مراكز تجارية", icon: "🛍️" },
  { type: "school", ar: "مدارس وجامعات", icon: "🎓" },
  { type: "hospital", ar: "مستشفيات وصيدليات", icon: "🏥" },
  { type: "mosque", ar: "مساجد", icon: "🕌" },
  { type: "park", ar: "حدائق ومتنزهات", icon: "🌳" },
  { type: "bank", ar: "بنوك", icon: "🏦" },
  { type: "gas_station", ar: "محطات وقود", icon: "⛽" },
  { type: "supermarket", ar: "سوبرماركت", icon: "🛒" },
  { type: "pharmacy", ar: "صيدليات", icon: "💊" },
];

async function searchNearby(
  lat: number,
  lng: number,
  type: string,
  apiKey: string
): Promise<PlaceResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=${type}&language=ar&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  return data.results || [];
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

    // Fetch all categories in parallel
    const results = await Promise.all(
      CATEGORIES.map(async (cat) => {
        const places = await searchNearby(lat, lng, cat.type, apiKey);
        return {
          category: cat.type,
          categoryAr: cat.ar,
          icon: cat.icon,
          places: places.slice(0, 10).map((p: PlaceResult) => ({
            name: p.name,
            vicinity: p.vicinity || "",
            rating: p.rating || null,
          })),
        } satisfies CategoryResult;
      })
    );

    // Summary counts for price simulation
    const summary = {
      restaurants: results.find((r) => r.category === "restaurant")?.places.length || 0,
      schools: results.find((r) => r.category === "school")?.places.length || 0,
      hospitals: results.find((r) => r.category === "hospital")?.places.length || 0,
      malls: results.find((r) => r.category === "shopping_mall")?.places.length || 0,
      mosques: results.find((r) => r.category === "mosque")?.places.length || 0,
      parks: results.find((r) => r.category === "park")?.places.length || 0,
      banks: results.find((r) => r.category === "bank")?.places.length || 0,
    };

    return NextResponse.json({ categories: results, summary });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث عن الأنشطة المحيطة" },
      { status: 500 }
    );
  }
}
