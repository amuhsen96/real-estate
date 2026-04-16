"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { PriceEstimate } from "@/lib/priceSimulator";

interface NearbyCategory {
  category: string;
  categoryAr: string;
  places: { distance: number | null }[];
}

interface Props {
  estimate: PriceEstimate;
  district: string | null;
  city: string | null;
  nearbyCategories?: NearbyCategory[];
  trendChange?: number | null;
}

// Parse the 3 sections from Claude's response
function parseSections(text: string): { strengths: string[]; weaknesses: string[]; recommendation: string[] } {
  const sections = { strengths: [] as string[], weaknesses: [] as string[], recommendation: [] as string[] };

  const strengthMatch = text.match(/\*\*نقاط القوة[:\s]*\*\*([\s\S]+?)(?=\*\*نقاط الضعف|\*\*التوصية|$)/);
  const weaknessMatch = text.match(/\*\*نقاط الضعف[:\s]*\*\*([\s\S]+?)(?=\*\*التوصية|$)/);
  const recommendMatch = text.match(/\*\*التوصية[\s\S]*?\*\*([\s\S]+?)(?=$)/);

  const extractBullets = (raw: string | undefined): string[] => {
    if (!raw) return [];
    return raw
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.]\s*/, "").trim())
      .filter((l) => l.length > 5);
  };

  sections.strengths = extractBullets(strengthMatch?.[1]);
  sections.weaknesses = extractBullets(weaknessMatch?.[1]);
  sections.recommendation = extractBullets(recommendMatch?.[1]);
  return sections;
}

export default function AIInsights({ estimate, district, city, nearbyCategories = [], trendChange = null }: Props) {
  const { lang } = useI18n();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [insights, setInsights] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleFetch = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate, district, city, nearbyCategories, trendChange }),
      });
      const d = await res.json();
      if (d.error) { setErrorMsg(d.error); setStatus("error"); return; }
      setInsights(d.insights);
      setStatus("done");
    } catch {
      setErrorMsg(lang === "en" ? "Connection error" : "تعذّر الاتصال");
      setStatus("error");
    }
  };

  const sections = status === "done" ? parseSections(insights) : null;

  const SectionIcon = ({ type }: { type: "strength" | "weakness" | "recommendation" }) => {
    if (type === "strength") return <span className="text-green-600 font-bold">✦</span>;
    if (type === "weakness") return <span className="text-red-500 font-bold">✦</span>;
    return <span className="text-blue-600 font-bold">✦</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {lang === "en" ? "AI Analysis" : "التحليل الذكي"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === "en" ? "Powered by Claude AI" : "مدعوم بـ Claude AI"}
              </p>
            </div>
          </div>

          {status === "idle" && (
            <button
              onClick={handleFetch}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              {lang === "en" ? "Get AI Analysis" : "احصل على تحليل ذكي"}
            </button>
          )}
          {status === "error" && (
            <button
              onClick={handleFetch}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl hover:bg-red-100 transition-colors"
            >
              {lang === "en" ? "Retry" : "أعد المحاولة"}
            </button>
          )}
        </div>
      </div>

      {status === "loading" && (
        <div className="px-6 py-8 flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-400">
            {lang === "en" ? "Analyzing property data…" : "جاري تحليل البيانات العقارية..."}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="px-6 py-4 text-sm text-red-600 text-center">{errorMsg}</div>
      )}

      {status === "done" && sections && (
        <div className="px-6 py-5 space-y-5">
          {/* نقاط القوة */}
          {sections.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1">
                <span>✅</span> {lang === "en" ? "Strengths" : "نقاط القوة"}
              </h3>
              <ul className="space-y-1.5">
                {sections.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <SectionIcon type="strength" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* نقاط الضعف */}
          {sections.weaknesses.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1">
                <span>⚠️</span> {lang === "en" ? "Weaknesses" : "نقاط الضعف"}
              </h3>
              <ul className="space-y-1.5">
                {sections.weaknesses.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <SectionIcon type="weakness" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* التوصية */}
          {sections.recommendation.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                <span>💡</span> {lang === "en" ? "Investment Recommendation" : "التوصية الاستثمارية"}
              </h3>
              <ul className="space-y-1.5">
                {sections.recommendation.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <SectionIcon type="recommendation" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* If sections parsing failed, show raw text */}
          {sections.strengths.length === 0 && sections.weaknesses.length === 0 && (
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{insights}</p>
          )}

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            {lang === "en"
              ? "AI analysis — may not fully reflect current market conditions."
              : "التحليل بالذكاء الاصطناعي — قد لا يعكس واقع السوق بدقة 100%."}
          </p>
        </div>
      )}
    </div>
  );
}
