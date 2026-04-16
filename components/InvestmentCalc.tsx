"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

interface Props {
  pricePerSqm: number;
  area?: number;
}

export default function InvestmentCalc({ pricePerSqm, area: defaultArea = 150 }: Props) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [area,       setArea]       = useState(defaultArea);
  const [downPct,    setDownPct]    = useState(20);
  const [interest,   setInterest]   = useState(4.5);
  const [years,      setYears]      = useState(20);
  const [yieldPct,   setYieldPct]   = useState(7);

  const calc = useMemo(() => {
    const value      = Math.round(pricePerSqm * area);
    const loan       = value * (1 - downPct / 100);
    const monthRate  = interest / 100 / 12;
    const n          = years * 12;
    const monthly    = monthRate > 0
      ? Math.round(loan * (monthRate * Math.pow(1 + monthRate, n)) / (Math.pow(1 + monthRate, n) - 1))
      : Math.round(loan / n);
    const totalPaid  = monthly * n;
    const totalInt   = totalPaid - loan;
    const annualRent = Math.round(value * (yieldPct / 100));
    const monthlyRent = Math.round(annualRent / 12);
    const payback    = yieldPct > 0 ? Math.round((100 / yieldPct) * 10) / 10 : 0;
    const netAfterMortgage = monthlyRent - monthly;
    return { value, loan: Math.round(loan), monthly, totalPaid, totalInt: Math.round(totalInt),
             annualRent, monthlyRent, payback, netAfterMortgage };
  }, [pricePerSqm, area, downPct, interest, years, yieldPct]);

  const fmt = (n: number) => n.toLocaleString("en-US");
  const sar = lang === "en" ? "SAR" : "ر.س";

  const L = {
    title:         lang === "en" ? "Investment & Mortgage Calculator" : "حاسبة الرهن والاستثمار",
    propValue:     lang === "en" ? "Property Value" : "قيمة العقار",
    area:          lang === "en" ? "Area (m²)" : "المساحة (م²)",
    downPayment:   lang === "en" ? "Down Payment %" : "الدفعة الأولى %",
    interestRate:  lang === "en" ? "Interest Rate % / year" : "نسبة الفائدة % / سنة",
    loanYears:     lang === "en" ? "Loan Term (years)" : "مدة القرض (سنة)",
    loanAmount:    lang === "en" ? "Loan Amount" : "مبلغ التمويل",
    monthly:       lang === "en" ? "Monthly Payment" : "القسط الشهري",
    totalInterest: lang === "en" ? "Total Interest" : "إجمالي الفوائد",
    annualYield:   lang === "en" ? "Annual Rental Yield %" : "عائد الإيجار السنوي %",
    annualRent:    lang === "en" ? "Expected Annual Rent" : "الإيجار السنوي المتوقع",
    monthlyRent:   lang === "en" ? "Monthly Rent" : "الإيجار الشهري",
    payback:       lang === "en" ? "Payback Period" : "مدة الاسترداد",
    cashflow:      lang === "en" ? "Monthly Cash Flow (after mortgage)" : "التدفق الشهري (بعد القسط)",
    mortgageTitle: lang === "en" ? "Mortgage Calculator" : "حاسبة الرهن",
    investTitle:   lang === "en" ? "Investment Returns" : "العائد الاستثماري",
    years:         lang === "en" ? "years" : "سنة",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧮</span>
          <div className="text-right">
            <span className="font-bold text-gray-800">{L.title}</span>
            {!open && (
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === "en" ? `Property: ${fmt(calc.value)} SAR` : `قيمة العقار: ${fmt(calc.value)} ${sar}`}
              </p>
            )}
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          {/* إدخالات مشتركة */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{L.area}</label>
              <input type="number" value={area} min={30} max={5000}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{L.propValue}</label>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-700">
                {fmt(calc.value)} {sar}
              </div>
            </div>
          </div>

          {/* ─── قسم الرهن ─── */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <h3 className="font-semibold text-blue-800 text-sm">{L.mortgageTitle}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{L.downPayment}</label>
                <input type="number" value={downPct} min={5} max={80} step={5}
                  onChange={(e) => setDownPct(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{L.interestRate}</label>
                <input type="number" value={interest} min={0} max={20} step={0.1}
                  onChange={(e) => setInterest(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{L.loanYears}</label>
                <input type="number" value={years} min={1} max={30}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-200">
              {[
                { label: L.loanAmount,    value: `${fmt(calc.loan)} ${sar}`,      color: "text-gray-700" },
                { label: L.monthly,       value: `${fmt(calc.monthly)} ${sar}`,   color: "text-blue-700 font-bold text-base" },
                { label: L.totalInterest, value: `${fmt(calc.totalInt)} ${sar}`,  color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className={`text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── قسم العائد ─── */}
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-3">
            <h3 className="font-semibold text-green-800 text-sm">{L.investTitle}</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{L.annualYield}</label>
              <input type="range" value={yieldPct} min={2} max={15} step={0.5}
                onChange={(e) => setYieldPct(Number(e.target.value))}
                className="w-full accent-green-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>2%</span><span className="font-bold text-green-700">{yieldPct}%</span><span>15%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-200">
              {[
                { label: L.annualRent,  value: `${fmt(calc.annualRent)} ${sar}`,   color: "text-green-700 font-bold" },
                { label: L.monthlyRent, value: `${fmt(calc.monthlyRent)} ${sar}`,  color: "text-green-700" },
                { label: L.payback,     value: `${calc.payback} ${L.years}`,       color: "text-gray-700" },
                { label: L.cashflow,    value: `${calc.netAfterMortgage >= 0 ? "+" : ""}${fmt(calc.netAfterMortgage)} ${sar}`,
                  color: calc.netAfterMortgage >= 0 ? "text-green-700 font-bold" : "text-red-600 font-bold" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center bg-white rounded-lg py-2 px-1">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className={`text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
