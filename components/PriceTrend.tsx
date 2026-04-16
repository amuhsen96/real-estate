"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useI18n } from "@/lib/i18n";

interface TrendPoint {
  month: string;
  avg_sqm: number;
  cnt: number;
}

interface Props {
  city: string;
  dealType?: string;
  currentPrice?: number;
}

const DEAL_OPTIONS = [
  { value: "",      labelAr: "الكل",  labelEn: "All" },
  { value: "بيع",  labelAr: "بيع",   labelEn: "Sale" },
  { value: "إيجار", labelAr: "إيجار", labelEn: "Rent" },
];

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

export default function PriceTrend({ city, dealType: initialDeal = "بيع", currentPrice }: Props) {
  const { lang } = useI18n();
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealType, setDealType] = useState(initialDeal);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ city, ...(dealType ? { dealType } : {}) });
    fetch(`/api/trends?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setData(d.data.map((r: TrendPoint) => ({ ...r, avg_sqm: Number(r.avg_sqm) })));
        } else {
          setData([]);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [city, dealType]);

  const titleText = lang === "en" ? "Price Trend (3 Years)" : "اتجاه الأسعار (3 سنوات)";
  const subText   = lang === "en" ? `City: ${city}` : `المدينة: ${city}`;

  // حساب التغير مقارنة بأول نقطة
  const firstPrice = data[0]?.avg_sqm;
  const lastPrice  = data[data.length - 1]?.avg_sqm;
  const change     = firstPrice && lastPrice
    ? Math.round(((lastPrice - firstPrice) / firstPrice) * 100)
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{titleText}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subText}</p>
          </div>
          {/* فلتر نوع الصفقة */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {DEAL_OPTIONS.map((o) => (
              <button key={o.value}
                onClick={() => setDealType(o.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  dealType === o.value
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                {lang === "en" ? o.labelEn : o.labelAr}
              </button>
            ))}
          </div>
        </div>

        {/* التغير خلال 3 سنوات */}
        {change !== null && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-sm font-bold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
            </span>
            <span className="text-xs text-gray-400">
              {lang === "en" ? "change over 3 years" : "تغيّر خلال 3 سنوات"}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : error || data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            {lang === "en" ? "No trend data available for this city" : "لا توجد بيانات اتجاه كافية لهذه المدينة"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                interval={Math.floor(data.length / 5)}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={36}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toLocaleString()} ${lang === "en" ? "SAR/m²" : "ر.س/م²"}`, lang === "en" ? "Avg Price" : "متوسط السعر"]}
                labelFormatter={(m) => formatMonth(String(m))}
                contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
              />
              {currentPrice && (
                <ReferenceLine
                  y={currentPrice}
                  stroke="#2563eb"
                  strokeDasharray="6 3"
                  label={{ value: lang === "en" ? "Estimate" : "تقديرنا", position: "insideTopRight", fontSize: 10, fill: "#2563eb" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="avg_sqm"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#f59e0b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
