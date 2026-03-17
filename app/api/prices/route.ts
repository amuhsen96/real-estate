import { NextRequest, NextResponse } from "next/server";
import { simulatePrice, type NearbyPlaceSummary } from "@/lib/priceSimulator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, nearby } = body;

    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: "lat و lng مطلوبان" },
        { status: 400 }
      );
    }

    const summary: NearbyPlaceSummary = nearby || {
      restaurants: 0,
      schools: 0,
      hospitals: 0,
      malls: 0,
      mosques: 0,
      parks: 0,
      banks: 0,
    };

    const estimate = simulatePrice({ lat, lng }, summary);

    return NextResponse.json(estimate);
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء حساب الأسعار" },
      { status: 500 }
    );
  }
}
