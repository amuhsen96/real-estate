import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "الرابط مطلوب" }, { status: 400 });
    }

    // Follow redirects to get the final URL
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });

    const finalUrl = response.url;

    // Extract coordinates from the resolved URL
    const atMatch = finalUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return NextResponse.json({
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
        resolvedUrl: finalUrl,
      });
    }

    // Try q= parameter
    try {
      const parsedUrl = new URL(finalUrl);
      const q = parsedUrl.searchParams.get("q");
      if (q) {
        const coordMatch = q.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        if (coordMatch) {
          return NextResponse.json({
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2]),
            resolvedUrl: finalUrl,
          });
        }
      }
    } catch {
      // ignore URL parse errors
    }

    return NextResponse.json(
      { error: "لم نتمكن من استخراج الإحداثيات من الرابط المختصر" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "فشل في فتح الرابط المختصر" },
      { status: 500 }
    );
  }
}
