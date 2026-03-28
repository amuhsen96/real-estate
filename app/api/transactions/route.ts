import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Transaction } from "@/lib/priceSimulator";

const DB_PATH = join(process.cwd(), "data", "transactions.json");

function readTransactions(): Transaction[] {
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeTransactions(transactions: Transaction[]) {
  writeFileSync(DB_PATH, JSON.stringify(transactions, null, 2), "utf-8");
}

function parseCSV(raw: string): Transaction[] {
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect separator: tab (Excel paste) or comma
  const sep = lines[0].includes("\t") ? "\t" : ",";

  // Arabic and English header aliases
  const HEADERS: Record<string, string> = {
    المدينة: "city", city: "city",
    الحي: "district", district: "district", الحي_أو_المنطقة: "district",
    النوع: "propertyType", "نوع العقار": "propertyType", type: "propertyType",
    المساحة: "area", "المساحة م2": "area", "المساحة_م2": "area", area: "area",
    السعر: "price", "السعر الإجمالي": "price", price: "price",
    "خط العرض": "lat", lat: "lat",
    "خط الطول": "lng", lng: "lng",
    التاريخ: "date", date: "date",
    المصدر: "source", source: "source",
  };

  const firstCells = lines[0].split(sep).map((c) => c.trim());
  const hasHeader = firstCells.some((c) => HEADERS[c] !== undefined);

  let colMap: string[];
  let dataLines: string[];

  if (hasHeader) {
    colMap = firstCells.map((c) => HEADERS[c] ?? c.toLowerCase());
    dataLines = lines.slice(1);
  } else {
    // Assume fixed order: city, district, type, area, price[, lat, lng]
    colMap = ["city", "district", "propertyType", "area", "price", "lat", "lng"];
    dataLines = lines;
  }

  const results: Transaction[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cells = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    colMap.forEach((col, i) => {
      if (cells[i] !== undefined) row[col] = cells[i];
    });

    const city = row.city?.trim();
    const district = row.district?.trim();
    const propertyType = row.propertyType?.trim() || "غير محدد";
    const area = parseFloat(row.area ?? "");
    const price = parseFloat(row.price?.replace(/,/g, "") ?? "");

    if (!city || !district || isNaN(area) || isNaN(price) || area <= 0 || price <= 0)
      continue;

    const pricePerSqm = Math.round(price / area);
    const lat = row.lat ? parseFloat(row.lat) : undefined;
    const lng = row.lng ? parseFloat(row.lng) : undefined;

    results.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      city,
      district,
      propertyType,
      area,
      price,
      pricePerSqm,
      ...(lat && lng && !isNaN(lat) && !isNaN(lng) ? { lat, lng } : {}),
      ...(row.date ? { date: row.date } : {}),
      ...(row.source ? { source: row.source } : {}),
    });
  }

  return results;
}

// GET — list all transactions
export async function GET() {
  const transactions = readTransactions();
  return NextResponse.json(transactions);
}

// POST — add one transaction or bulk CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transactions = readTransactions();

    if (body.type === "csv") {
      const parsed = parseCSV(body.data ?? "");
      if (parsed.length === 0) {
        return NextResponse.json(
          { error: "لم يتم التعرف على أي صفقة في البيانات المُدخلة" },
          { status: 400 }
        );
      }
      transactions.push(...parsed);
      writeTransactions(transactions);
      return NextResponse.json({ added: parsed.length, total: transactions.length });
    }

    // Single transaction
    const { city, district, propertyType, area, price, lat, lng, date, source } = body;
    if (!city || !district || !area || !price) {
      return NextResponse.json({ error: "الحقول المطلوبة: المدينة، الحي، المساحة، السعر" }, { status: 400 });
    }

    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      city: city.trim(),
      district: district.trim(),
      propertyType: (propertyType ?? "غير محدد").trim(),
      area: Number(area),
      price: Number(price),
      pricePerSqm: Math.round(Number(price) / Number(area)),
      ...(lat && lng ? { lat: Number(lat), lng: Number(lng) } : {}),
      ...(date ? { date } : {}),
      ...(source ? { source } : {}),
    };

    transactions.push(tx);
    writeTransactions(transactions);
    return NextResponse.json(tx, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في معالجة الطلب" }, { status: 500 });
  }
}

// DELETE — remove one transaction (?id=xxx) or all (?all=true)
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const all = request.nextUrl.searchParams.get("all");

  if (all === "true") {
    writeTransactions([]);
    return NextResponse.json({ deleted: "all", total: 0 });
  }

  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  let transactions = readTransactions();
  const before = transactions.length;
  transactions = transactions.filter((t) => t.id !== id);

  if (transactions.length === before) {
    return NextResponse.json({ error: "لم يتم إيجاد الصفقة" }, { status: 404 });
  }

  writeTransactions(transactions);
  return NextResponse.json({ deleted: id, total: transactions.length });
}
