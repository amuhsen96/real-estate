import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface NearbyCategory {
  category: string;
  categoryAr: string;
  places: { distance: number | null }[];
}

interface Estimate {
  pricePerSqmSale: number;
  monthlyRent: number;
  priceRangeMin: number;
  priceRangeMax: number;
  locationScore: number;
  areaClassification: string;
  dataSource: string;
  transactionCount?: number;
  confidence?: number;
  nearestMetro?: { nameAr: string; distKm: number } | null;
  nearestStadium?: { nameAr: string; distKm: number } | null;
  scoreBreakdown?: { metro: number; geography: number; market: number };
}

function buildPrompt(
  estimate: Estimate,
  district: string | null,
  city: string | null,
  nearbyCategories: NearbyCategory[],
  trendChange: number | null,
): string {
  const nearby = nearbyCategories
    .filter((c) => c.places.some((p) => p.distance != null && p.distance <= 2000))
    .map((c) => c.categoryAr)
    .join("، ");

  const metroInfo = estimate.nearestMetro
    ? `أقرب محطة مترو: ${estimate.nearestMetro.nameAr} على بُعد ${estimate.nearestMetro.distKm.toFixed(1)} كم`
    : "لا توجد محطة مترو قريبة";

  const trendInfo = trendChange !== null
    ? `اتجاه أسعار المدينة خلال 3 سنوات: ${trendChange >= 0 ? "ارتفع" : "انخفض"} بنسبة ${Math.abs(trendChange)}%`
    : "";

  return `أنت خبير عقاري سعودي متخصص. قدّم تحليلاً استثمارياً موجزاً للعقار التالي باللغة العربية الفصحى البسيطة.

معطيات العقار:
- المدينة: ${city ?? "غير معروف"}
- الحي: ${district ?? "غير محدد"}
- تصنيف المنطقة: ${estimate.areaClassification}
- سعر المتر المربع (بيع): ${estimate.pricePerSqmSale.toLocaleString("en-US")} ريال/م²
- نطاق الأسعار: ${estimate.priceRangeMin.toLocaleString("en-US")} – ${estimate.priceRangeMax.toLocaleString("en-US")} ريال/م²
- الإيجار الشهري التقديري: ${estimate.monthlyRent.toLocaleString("en-US")} ريال
- درجة جودة الموقع: ${estimate.locationScore}/10
- ${metroInfo}
- الخدمات القريبة (في 2 كم): ${nearby || "لا توجد بيانات"}
- مصدر البيانات: ${estimate.dataSource === "real" ? "بيانات حقيقية من السوق" : "تقديرية"}
${trendInfo ? `- ${trendInfo}` : ""}

قدّم التحليل في ثلاثة أقسام فقط، كل قسم بعنوان وثلاث نقاط:
**نقاط القوة:**
**نقاط الضعف:**
**التوصية الاستثمارية:**

اجعل كل نقطة جملة واحدة موجزة. لا تكرر المعطيات الرقمية كما هي.`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY غير مُعيَّن" }, { status: 503 });
    }

    const { estimate, district, city, nearbyCategories = [], trendChange = null } = await request.json();

    if (!estimate) {
      return NextResponse.json({ error: "estimate مطلوب" }, { status: 400 });
    }

    const prompt = buildPrompt(estimate, district, city, nearbyCategories, trendChange);

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    return NextResponse.json({ insights: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
