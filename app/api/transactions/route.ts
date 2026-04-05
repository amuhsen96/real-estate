import { NextRequest, NextResponse } from "next/server";
import pool, { rowToTransaction } from "@/lib/db";
import type { Transaction } from "@/lib/priceSimulator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TABLE = process.env.DB_TABLE ?? "aqar";

function detectSep(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

function parseCSV(raw: string): Transaction[] {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const sep = detectSep(lines[0]);

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

  const firstCells = lines[0].split(sep).map((c) => c.trim());
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
    const cells = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    colMap.forEach((col, i) => { if (cells[i] !== undefined) row[col] = cells[i]; });

    const city = row.city?.trim();
    const district = row.district?.trim();
    const propertyType = row.propertyType?.trim() || "غير محدد";
    const area = parseFloat(row.area ?? "");
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
      ...(row.dealType ? { dealType: row.dealType.trim() } : {}),
      ...(row.region ? { region: row.region.trim() } : {}),
      ...(lat && lng && !isNaN(lat) && !isNaN(lng) ? { lat, lng } : {}),
      ...(row.date ? { date: row.date } : {}),
      ...(row.source ? { source: row.source } : {}),
    });
  }

  return results;
}

// GET — list recent transactions
export async function GET() {
  const [rows] = await pool.query(
    `SELECT ad_no, city, district, property_type, area, price, deal_type, region, data_date, source
     FROM \`${TABLE}\`
     ORDER BY data_date DESC
     LIMIT 500`
  );
  const transactions = (rows as Record<string, unknown>[]).map(rowToTransaction);
  return NextResponse.json(transactions);
}

// POST — add one transaction (manual) or bulk CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.type === "csv") {
      const parsed = parseCSV(body.data ?? "");
      if (parsed.length === 0) {
        return NextResponse.json(
          { error: "لم يتم التعرف على أي صفقة في البيانات المُدخلة" },
          { status: 400 }
        );
      }

      // Bulk INSERT بـ batches
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize);
        const values = batch.map((tx) => [
          tx.city, tx.district, tx.propertyType, tx.area, tx.price,
          tx.dealType ?? null, tx.region ?? null, tx.date ?? null,
          tx.source ?? null, "csv",
        ]);
        await pool.query(
          `INSERT INTO \`${TABLE}\` (city, district, property_type, area, price, deal_type, region, data_date, source, add_type) VALUES ?`,
          [values]
        );
        inserted += batch.length;
      }

      const [[countRow]] = await pool.query(`SELECT COUNT(*) as total FROM \`${TABLE}\``) as [Record<string, number>[], unknown];
      return NextResponse.json({ added: inserted, total: countRow.total });
    }

    // إدخال يدوي مفرد
    const { city, district, propertyType, area, price, dealType, region, date, source } = body;
    if (!city || !district || !area || !price) {
      return NextResponse.json({ error: "الحقول المطلوبة: المدينة، الحي، المساحة، السعر" }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO \`${TABLE}\` (city, district, property_type, area, price, deal_type, region, data_date, source, add_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
      [
        String(city).trim(),
        String(district).trim(),
        String(propertyType ?? "غير محدد").trim(),
        Number(area),
        Number(price),
        dealType ?? null,
        region ?? null,
        date ?? null,
        source ?? null,
      ]
    ) as [{ insertId: number }, unknown];

    const insertedId = (result as { insertId: number }).insertId;
    const tx: Transaction = {
      id: String(insertedId),
      city: String(city).trim(),
      district: String(district).trim(),
      propertyType: String(propertyType ?? "غير محدد").trim(),
      area: Number(area),
      price: Number(price),
      pricePerSqm: Math.round(Number(price) / Number(area)),
      ...(dealType ? { dealType } : {}),
      ...(region ? { region } : {}),
      ...(date ? { date } : {}),
      ...(source ? { source } : {}),
    };

    return NextResponse.json(tx, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `خطأ في معالجة الطلب: ${msg}` }, { status: 500 });
  }
}

// DELETE — remove one transaction (?id=xxx) or all (?all=true)
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const all = request.nextUrl.searchParams.get("all");

  if (all === "true") {
    await pool.query(`DELETE FROM \`${TABLE}\``);
    return NextResponse.json({ deleted: "all", total: 0 });
  }

  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const [result] = await pool.query(
    `DELETE FROM \`${TABLE}\` WHERE ad_no = ?`,
    [id]
  ) as [{ affectedRows: number }, unknown];

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return NextResponse.json({ error: "لم يتم إيجاد الصفقة" }, { status: 404 });
  }

  const [[countRow]] = await pool.query(`SELECT COUNT(*) as total FROM \`${TABLE}\``) as [Record<string, number>[], unknown];
  return NextResponse.json({ deleted: id, total: countRow.total });
}
