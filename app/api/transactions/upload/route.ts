import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { Transaction } from "@/lib/priceSimulator";

export const dynamic = "force-dynamic";

const DB_PATH = join(process.cwd(), "data", "transactions.json");

function readTransactions(): Transaction[] {
  try {
    return JSON.parse(readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeTransactions(transactions: Transaction[]) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(transactions, null, 2), "utf-8");
}

function detectSep(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

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

function parseCSV(raw: string): Transaction[] {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const sep = detectSep(lines[0]);

  function splitLine(line: string): string[] {
    // دعم الخلايا المحاطة بعلامات تنصيص
    const result: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === sep && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const firstCells = splitLine(lines[0]);
  const hasHeader = firstCells.some((c) => HEADERS[c] !== undefined);

  let colMap: string[];
  let dataLines: string[];

  if (hasHeader) {
    colMap = firstCells.map((c) => HEADERS[c] ?? c.toLowerCase());
    dataLines = lines.slice(1);
  } else {
    colMap = ["city", "district", "propertyType", "area", "price", "lat", "lng"];
    dataLines = lines;
  }

  const results: Transaction[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    colMap.forEach((col, i) => { if (cells[i] !== undefined) row[col] = cells[i]; });

    const city = row.city?.trim();
    const district = row.district?.trim();
    const propertyType = row.propertyType?.trim() || "غير محدد";
    const area = parseFloat(row.area?.replace(/,/g, "") ?? "");
    const price = parseFloat(row.price?.replace(/,/g, "") ?? "");

    if (!city || !district || isNaN(area) || isNaN(price) || area <= 0 || price <= 0) continue;

    const lat = row.lat ? parseFloat(row.lat) : undefined;
    const lng = row.lng ? parseFloat(row.lng) : undefined;

    results.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      city,
      district,
      propertyType,
      area,
      price,
      pricePerSqm: Math.round(price / area),
      ...(lat && lng && !isNaN(lat) && !isNaN(lng) ? { lat, lng } : {}),
      ...(row.date ? { date: row.date } : {}),
      ...(row.source ? { source: row.source } : {}),
    });
  }

  return results;
}

// POST — استقبال ملف CSV عبر FormData
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data = formData.get("data");

    if (!data || typeof data !== "string") {
      return NextResponse.json({ error: "لم يتم إرسال بيانات" }, { status: 400 });
    }

    const parsed = parseCSV(data);

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "لم يتم التعرف على أي صفقة. تأكد من تنسيق الأعمدة: المدينة، الحي، النوع، المساحة، السعر" },
        { status: 400 }
      );
    }

    const transactions = readTransactions();
    transactions.push(...parsed);
    writeTransactions(transactions);

    return NextResponse.json({ added: parsed.length, total: transactions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `خطأ في معالجة الملف: ${msg}` }, { status: 500 });
  }
}
