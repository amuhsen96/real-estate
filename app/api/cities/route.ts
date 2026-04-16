import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const table = process.env.DB_TABLE ?? "aqar";
    const [rows] = await pool.query(
      `SELECT city, COUNT(*) AS cnt
       FROM \`${table}\`
       WHERE city IS NOT NULL AND city != ''
         AND (price + 0) > 0 AND (area + 0) > 0
       GROUP BY city
       HAVING cnt >= 50
       ORDER BY cnt DESC
       LIMIT 60`,
    );
    const cities = (rows as { city: string; cnt: number }[]).map((r) => r.city);
    return NextResponse.json({ cities });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
