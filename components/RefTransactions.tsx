"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface RefTx {
  district: string;
  propertyType: string;
  area: number;
  pricePerSqm: number;
  date: string | null;
  source: string | null;
}

interface Props {
  transactions: RefTx[];
  isLoading?: boolean;
}

export default function RefTransactions({ transactions, isLoading }: Props) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;
  if (!transactions || transactions.length === 0) return null;

  const L = {
    title:    lang === "en" ? "Reference Transactions" : "الصفقات المرجعية",
    subtitle: lang === "en"
      ? `${transactions.length} transactions used in this estimate`
      : `${transactions.length} صفقات استُخدمت في هذا التقدير`,
    district:  lang === "en" ? "District" : "الحي",
    type:      lang === "en" ? "Type" : "النوع",
    area:      lang === "en" ? "Area" : "المساحة",
    priceSqm:  lang === "en" ? "SAR/m²" : "ر.س/م²",
    date:      lang === "en" ? "Date" : "التاريخ",
    source:    lang === "en" ? "Source" : "المصدر",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div className="text-right">
            <span className="font-bold text-gray-800">{L.title}</span>
            <p className="text-xs text-gray-400 mt-0.5">{L.subtitle}</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[L.district, L.type, L.area, L.priceSqm, L.date, L.source].map((h) => (
                    <th key={h} className="py-2 px-2 text-right text-xs font-semibold text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-700">{tx.district || "—"}</td>
                    <td className="py-2 px-2 text-gray-600 text-xs">{tx.propertyType || "—"}</td>
                    <td className="py-2 px-2 text-gray-600">{tx.area} م²</td>
                    <td className="py-2 px-2 font-medium text-blue-700">
                      {tx.pricePerSqm.toLocaleString("en-US")}
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-xs">
                      {tx.date ? tx.date.toString().slice(0, 7) : "—"}
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-xs">{tx.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
