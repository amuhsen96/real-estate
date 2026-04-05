import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

const TABLE = process.env.DB_TABLE ?? "aqar";

const HEADERS: Record<string, string> = {
  المدينة: "city", city: "city",
  الحي: "district", district: "district", الحي_أو_المنطقة: "district",
  النوع: "propertyType", "نوع العقار": "propertyType", type: "propertyType",
  المساحة: "area", "المساحة م2": "area", "المساحة_م2": "area", area: "area", Area: "area",
  السعر: "price", "السعر الإجمالي": "price", price: "price", Price: "price",
  "نوع الصفقة (بيع/إيجار)": "dealType", "نوع الصفقة": "dealType", dealtype: "dealType",
  المنطقة: "region", region: "region",
  "خط العرض": "lat", lat: "lat",
  "خط الطول": "lng", lng: "lng",
  التاريخ: "date", date: "date",
  المصدر: "source", source: "source",
};

function detectSep(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

interface ParsedRow {
  city: string;
  district: string;
  propertyType: string;
  area: number;
  price: number;
  dealType?: string;
  region?: string;
  date?: string;
  source?: string;
}

function parseCSV(raw: string): { rows: ParsedRow[]; preview: string[][] } {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], preview: [] };

  const sep = detectSep(lines[0]);

  function splitLine(line: string): string[] {
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

  const preview: string[][] = [];
  if (hasHeader) preview.push(firstCells);
  for (const line of dataLines.slice(0, 5)) preview.push(splitLine(line));

  const rows: ParsedRow[] = [];

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

    rows.push({
      city,
      district,
      propertyType,
      area,
      price,
      ...(row.dealType ? { dealType: row.dealType.trim() } : {}),
      ...(row.region ? { region: row.region.trim() } : {}),
      ...(row.date ? { date: row.date } : {}),
      ...(row.source ? { source: row.source } : {}),
    });
  }

  return { rows, preview };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
    }

    const ext = (file as File).name.split(".").pop()?.toLowerCase();
    let csvContent: string;

    if (ext === "xlsx" || ext === "xls") {
      const buf = Buffer.from(await (file as File).arrayBuffer());
      const wb = XLSX.read(buf, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      csvContent = XLSX.utils.sheet_to_csv(ws);
    } else {
      csvContent = await (file as File).text();
    }

    const { rows: parsed, preview } = parseCSV(csvContent);

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "لم يتم التعرف على أي صفقة. تأكد من تنسيق الأعمدة: المدينة، الحي، النوع، المساحة، السعر" },
        { status: 400 }
      );
    }

    // Bulk INSERT بـ batches
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize);
      const values = batch.map((row) => [
        row.city, row.district, row.propertyType, row.area, row.price,
        row.dealType ?? null, row.region ?? null, row.date ?? null,
        row.source ?? null, "upload",
      ]);
      await pool.query(
        `INSERT INTO \`${TABLE}\` (city, district, property_type, area, price, deal_type, region, data_date, source, add_type) VALUES ?`,
        [values]
      );
      inserted += batch.length;
    }

    const [[countRow]] = await pool.query(`SELECT COUNT(*) as total FROM \`${TABLE}\``) as [Record<string, number>[], unknown];
    return NextResponse.json({ added: inserted, total: countRow.total, preview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `خطأ في معالجة الملف: ${msg}` }, { status: 500 });
  }
}
