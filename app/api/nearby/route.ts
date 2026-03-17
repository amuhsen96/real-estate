import { NextRequest, NextResponse } from "next/server";

interface PlaceResult {
  name: string;
  vicinity?: string;
  rating?: number;
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

// Each category has: legacy type, new API types, optional keyword
const CATEGORIES = [
  {
    type: "restaurant",
    newTypes: ["restaurant", "cafe"],
    keyword: null,
    ar: "مطاعم وكافيهات",
    icon: "🍽️",
  },
  {
    type: "shopping_mall",
    newTypes: ["shopping_mall"],
    keyword: null,
    ar: "مراكز تجارية",
    icon: "🛍️",
  },
  {
    type: "school",
    newTypes: ["school", "university"],
    keyword: null,
    ar: "مدارس وجامعات",
    icon: "🎓",
  },
  {
    type: "hospital",
    newTypes: ["hospital", "medical_clinic"],
    keyword: null,
    ar: "مستشفيات وعيادات",
    icon: "🏥",
  },
  {
    type: "place_of_worship",
    newTypes: ["mosque"],
    keyword: "mosque",
    ar: "مساجد",
    icon: "🕌",
  },
  {
    type: "park",
    newTypes: ["park"],
    keyword: null,
    ar: "حدائق ومتنزهات",
    icon: "🌳",
  },
  {
    type: "bank",
    newTypes: ["bank", "atm"],
    keyword: null,
    ar: "بنوك وصرافات",
    icon: "🏦",
  },
  {
    type: "gas_station",
    newTypes: ["gas_station"],
    keyword: null,
    ar: "محطات وقود",
    icon: "⛽",
  },
  {
    type: "supermarket",
    newTypes: ["supermarket", "grocery_store"],
    keyword: null,
    ar: "سوبرماركت",
    icon: "🛒",
  },
  {
    type: "pharmacy",
    newTypes: ["pharmacy"],
    keyword: null,
    ar: "صيدليات",
    icon: "💊",
  },
];

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

// ── New Places API (v1) ──────────────────────────────────────────────────────
async function searchNearbyV1(
  lat: number,
  lng: number,
  includedTypes: string[],
  apiKey: string
): Promise<{ places: PlaceResult[]; status: string }> {
  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.rating,places.location",
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: MAX_RADIUS,
            },
          },
          languageCode: "ar",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message ?? `HTTP ${response.status}`;
      return { places: [], status: `V1_ERROR: ${msg}` };
    }

    const places: PlaceResult[] = (data.places ?? []).map(
      (p: {
        displayName?: { text?: string } | string;
        formattedAddress?: string;
        rating?: number;
        location?: { latitude: number; longitude: number };
      }) => ({
        name:
          typeof p.displayName === "string"
            ? p.displayName
            : (p.displayName?.text ?? ""),
        vicinity: p.formattedAddress ?? "",
        rating: p.rating,
        geometry: p.location
          ? {
              location: {
                lat: p.location.latitude,
                lng: p.location.longitude,
              },
            }
          : undefined,
      })
    );

    return { places, status: "OK" };
  } catch (e) {
    return { places: [], status: `V1_EXCEPTION: ${String(e)}` };
  }
}

// ── Legacy Places API (nearbysearch) ─────────────────────────────────────────
async function searchNearbyLegacy(
  lat: number,
  lng: number,
  type: string,
  keyword: string | null,
  apiKey: string
): Promise<{ places: PlaceResult[]; status: string }> {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${MAX_RADIUS}&type=${type}&language=ar&key=${apiKey}`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      places: data.results ?? [],
      status: data.status ?? "UNKNOWN",
    };
  } catch (e) {
    return { places: [], status: `LEGACY_EXCEPTION: ${String(e)}` };
  }
}

// ── Combined search: try new API first, fallback to legacy ───────────────────
async function searchCategory(
  lat: number,
  lng: number,
  cat: (typeof CATEGORIES)[0],
  apiKey: string
): Promise<{ places: PlaceResult[]; apiStatus: string }> {
  // 1. Try new Places API
  const v1 = await searchNearbyV1(lat, lng, cat.newTypes, apiKey);
  if (v1.status === "OK" && v1.places.length > 0) {
    return { places: v1.places, apiStatus: "V1_OK" };
  }

  // 2. Fallback to legacy nearbysearch
  const legacy = await searchNearbyLegacy(
    lat,
    lng,
    cat.type,
    cat.keyword,
    apiKey
  );
  if (legacy.status === "OK") {
    return { places: legacy.places, apiStatus: "LEGACY_OK" };
  }

  // Both failed — return the most useful error
  const errorStatus =
    legacy.status !== "ZERO_RESULTS" && legacy.status !== "UNKNOWN"
      ? legacy.status
      : v1.status;

  return { places: [], apiStatus: errorStatus };
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
        { error: "لم يتم تعيين مفتاح Google Maps API في ملف .env.local" },
        { status: 500 }
      );
    }

    const rawResults = await Promise.all(
      CATEGORIES.map(async (cat) => {
        const { places, apiStatus } = await searchCategory(
          lat,
          lng,
          cat,
          apiKey
        );
        return {
          category: cat.type,
          categoryAr: cat.ar,
          icon: cat.icon,
          apiStatus,
          places: places
            .map((p) => ({
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
              (a, b) =>
                (a.distance ?? MAX_RADIUS) - (b.distance ?? MAX_RADIUS)
            )
            .slice(0, 20),
        } satisfies CategoryResult & { apiStatus: string };
      })
    );

    // Detect API-level errors (same error across all categories = key/billing issue)
    const errorStatuses = rawResults
      .filter((r) => r.places.length === 0 && r.apiStatus !== "LEGACY_OK" && r.apiStatus !== "V1_OK")
      .map((r) => r.apiStatus);

    const apiError =
      errorStatuses.length === CATEGORIES.length
        ? `Google API error: ${[...new Set(errorStatuses)].join(", ")}`
        : null;

    const results: CategoryResult[] = rawResults.map(
      ({ apiStatus: _a, ...rest }) => rest
    );

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
        results.find((r) => r.category === "place_of_worship")?.places.length ??
        0,
      parks: results.find((r) => r.category === "park")?.places.length ?? 0,
      banks: results.find((r) => r.category === "bank")?.places.length ?? 0,
    };

    return NextResponse.json({
      categories: results,
      summary,
      ...(apiError ? { apiError } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث عن الأنشطة المحيطة" },
      { status: 500 }
    );
  }
}
