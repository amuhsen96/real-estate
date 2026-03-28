import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { estimatePrice } from "@/lib/priceSimulator";
import type { Transaction, MetroStation, Stadium } from "@/lib/priceSimulator";

function loadTransactions(): Transaction[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "transactions.json"), "utf-8"));
  } catch {
    return [];
  }
}

function loadMetroStations(): MetroStation[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "metro-stations.json"), "utf-8"));
  } catch {
    return [];
  }
}

function loadStadiums(): Stadium[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "stadiums.json"), "utf-8"));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, propertyType, area } = body;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat و lng مطلوبان" }, { status: 400 });
    }

    const transactions = loadTransactions();
    const metroStations = loadMetroStations();
    const stadiums = loadStadiums();

    const estimate = estimatePrice(
      { lat, lng },
      transactions,
      propertyType ?? undefined,
      area ? Number(area) : undefined,
      metroStations,
      stadiums
    );
    return NextResponse.json(estimate);
  } catch {
    return NextResponse.json({ error: "حدث خطأ أثناء حساب الأسعار" }, { status: 500 });
  }
}
