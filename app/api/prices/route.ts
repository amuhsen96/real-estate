import { NextRequest, NextResponse } from "next/server";
import { estimatePrice } from "@/lib/priceSimulator";

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

    const estimate = estimatePrice({ lat, lng });
    return NextResponse.json(estimate);
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء حساب الأسعار" },
      { status: 500 }
    );
  }
}
