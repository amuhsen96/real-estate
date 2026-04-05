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

/** تحويل قيمة varchar (قد تحتوي فواصل) إلى رقم */
function toNum(val: unknown): number {
  if (val == null || val === "") return 0;
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToTransaction(row: Record<string, any>): Transaction {
  const area  = toNum(row.area);
  const price = toNum(row.price);
  return {
    id: String(row.ad_no ?? ""),
    city: row.city ?? "",
    district: row.district ?? "",
    propertyType: row.property_type ?? "غير محدد",
    area,
    price,
    pricePerSqm: area > 0 ? Math.round(price / area) : 0,
    ...(row.deal_type  ? { dealType: row.deal_type }      : {}),
    ...(row.region     ? { region: row.region }           : {}),
    ...(row.data_date  ? { date: String(row.data_date) }  : {}),
    ...(row.source     ? { source: row.source }           : {}),
  };
}

/** يضيف عمود source وindex على city إذا لم يكونا موجودَين */
export async function ensureSchema(): Promise<void> {
  const table = process.env.DB_TABLE ?? "aqar";
  // إضافة عمود source (تجاهل الخطأ إن كان موجوداً)
  try {
    await pool.query(
      `ALTER TABLE \`${table}\` ADD COLUMN source VARCHAR(255) NULL DEFAULT NULL`
    );
  } catch { /* already exists */ }
  // إضافة index على city لتسريع الاستعلامات
  try {
    await pool.query(
      `CREATE INDEX idx_city ON \`${table}\` (city(100))`
    );
  } catch { /* already exists */ }
}

// تنفيذ ensureSchema مرة واحدة عند بدء التشغيل
ensureSchema();
