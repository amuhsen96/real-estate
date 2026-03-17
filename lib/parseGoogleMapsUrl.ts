export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ParseResult {
  success: boolean;
  coordinates?: Coordinates;
  error?: string;
  needsServerResolve?: boolean;
}

/**
 * Parse coordinates from various Google Maps URL formats or direct input.
 *
 * Supported formats:
 * 1. Direct coordinates: "24.7136, 46.6753"
 * 2. @lat,lng in URL: https://www.google.com/maps/place/.../@24.7136,46.6753,17z
 * 3. ll= parameter: https://maps.google.com?ll=24.7136,46.6753
 * 4. q= parameter with coords: https://maps.google.com?q=24.7136,46.6753
 * 5. Short URLs (maps.app.goo.gl): needs server-side resolution
 */
export function parseInput(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { success: false, error: "الرجاء إدخال إحداثيات أو رابط خريطة" };
  }

  // Check if it's a short URL that needs server resolution
  if (isShortUrl(trimmed)) {
    return { success: false, needsServerResolve: true };
  }

  // Try parsing as direct coordinates
  const directCoords = parseDirectCoordinates(trimmed);
  if (directCoords) return { success: true, coordinates: directCoords };

  // Try parsing as Google Maps URL
  const urlCoords = parseGoogleMapsUrl(trimmed);
  if (urlCoords) return { success: true, coordinates: urlCoords };

  return {
    success: false,
    error: "لم نتمكن من استخراج الإحداثيات. تأكد من صحة الرابط أو أدخل الإحداثيات مباشرة (مثال: 24.7136, 46.6753)",
  };
}

function isShortUrl(input: string): boolean {
  return (
    input.includes("maps.app.goo.gl") ||
    input.includes("goo.gl/maps") ||
    (input.includes("goo.gl") && !input.includes("google.com"))
  );
}

function parseDirectCoordinates(input: string): Coordinates | null {
  // Match: "24.7136, 46.6753" or "24.7136,46.6753" or "24.7136 46.6753"
  const match = input.match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*[,،\s]\s*(-?\d{1,3}(?:\.\d+)?)$/
  );
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function parseGoogleMapsUrl(input: string): Coordinates | null {
  // Pattern 1: @lat,lng in URL path
  const atMatch = input.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinate(lat, lng)) return { lat, lng };
  }

  // Try URL parameter parsing
  try {
    const url = new URL(input);

    // Pattern 2: ll= parameter
    const ll = url.searchParams.get("ll");
    if (ll) {
      const parts = ll.split(",");
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isValidCoordinate(lat, lng)) return { lat, lng };
      }
    }

    // Pattern 3: q= parameter (if it contains coordinates)
    const q = url.searchParams.get("q");
    if (q) {
      const coordMatch = q.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (isValidCoordinate(lat, lng)) return { lat, lng };
      }
    }

    // Pattern 4: center= parameter
    const center = url.searchParams.get("center");
    if (center) {
      const parts = center.split(",");
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isValidCoordinate(lat, lng)) return { lat, lng };
      }
    }
  } catch {
    // Not a valid URL, already tried regex
  }

  // Pattern 5: /place/ path with coordinates
  const placeMatch = input.match(
    /\/place\/[^/]*\/(-?\d+\.?\d*),(-?\d+\.?\d*)/
  );
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (isValidCoordinate(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
