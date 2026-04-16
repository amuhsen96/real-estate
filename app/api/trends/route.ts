import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city      = searchParams.get("city") ?? "";
  const dealType  = searchParams.get("dealType") ?? "";
  const propType  = searchParams.get("propertyType") ?? "";

  if (!city) return NextResponse.json({ error: "city مطلوب" }, { status: 400 });

  try {
    const table = process.env.DB_TABLE ?? "aqar";

    const conditions: string[] = [
      "(price + 0) > 0",
      "(area + 0) BETWEEN 30 AND 5000",
      "data_date IS NOT NULL",
      "data_date >= DATE_SUB(CURDATE(), INTERVAL 3 YEAR)",
      `city LIKE ?`,
    ];
    const params: unknown[] = [`%${city}%`];

    if (dealType) { conditions.push("deal_type = ?"); params.push(dealType); }
    if (propType) { conditions.push("property_type = ?"); params.push(propType); }

    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(data_date, '%Y-%m') AS month,
         ROUND(AVG((price + 0) / NULLIF((area + 0), 0)), 0) AS avg_sqm,
         COUNT(*) AS cnt
       FROM \`${table}\`
       WHERE ${conditions.join(" AND ")}
       GROUP BY DATE_FORMAT(data_date, '%Y-%m')
       HAVING cnt >= 3
       ORDER BY month ASC`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[trends]", err);
    return NextResponse.json({ error: "خطأ في جلب البيانات" }, { status: 500 });
  }
}
