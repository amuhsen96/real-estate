import mysql from "mysql2/promise";
import type { Transaction } from "./priceSimulator";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? "iValueRE",
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

export default pool;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToTransaction(row: Record<string, any>): Transaction {
  const area = Number(row.area) || 0;
  const price = Number(row.price) || 0;
  return {
    id: String(row.ad_no ?? row.id ?? ""),
    city: row.city ?? "",
    district: row.district ?? "",
    propertyType: row.property_type ?? "غير محدد",
    area,
    price,
    pricePerSqm: area > 0 ? Math.round(price / area) : 0,
    ...(row.deal_type ? { dealType: row.deal_type } : {}),
    ...(row.region ? { region: row.region } : {}),
    ...(row.data_date ? { date: String(row.data_date) } : {}),
    ...(row.source ? { source: row.source } : {}),
  };
}

/** يضيف عمود source إذا لم يكن موجوداً في الجدول */
export async function ensureSchema(): Promise<void> {
  try {
    const table = process.env.DB_TABLE ?? "aqar";
    await pool.query(
      `ALTER TABLE \`${table}\` ADD COLUMN IF NOT EXISTS source VARCHAR(255) NULL DEFAULT NULL`
    );
  } catch {
    // MySQL < 8 لا تدعم IF NOT EXISTS في ALTER COLUMN — نتجاهل الخطأ
  }
}

// تنفيذ ensureSchema مرة واحدة عند بدء التشغيل
ensureSchema();
