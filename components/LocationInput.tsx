"use client";

import { useState } from "react";
import { parseInput, type Coordinates } from "@/lib/parseGoogleMapsUrl";

interface LocationInputProps {
  onSearch: (coords: Coordinates) => void;
  isLoading: boolean;
}

export default function LocationInput({ onSearch, isLoading }: LocationInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = parseInput(input);

    if (result.success && result.coordinates) {
      onSearch(result.coordinates);
      return;
    }

    if (result.needsServerResolve) {
      // Resolve short URL server-side
      try {
        const res = await fetch("/api/resolve-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "فشل في فتح الرابط المختصر");
          return;
        }

        const data = await res.json();
        onSearch({ lat: data.lat, lng: data.lng });
        return;
      } catch {
        setError("فشل في الاتصال بالخادم لفتح الرابط المختصر");
        return;
      }
    }

    setError(result.error || "إدخال غير صالح");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            محلل موقع العقار
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            أدخل إحداثيات العقار أو رابط Google Maps للحصول على تحليل شامل للموقع
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="location-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              الموقع
            </label>
            <input
              id="location-input"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder="24.7136, 46.6753 أو رابط Google Maps"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                جاري التحليل...
              </>
            ) : (
              "تحليل الموقع"
            )}
          </button>

          <div className="text-xs text-gray-400 space-y-1">
            <p>الصيغ المدعومة:</p>
            <ul className="list-disc list-inside space-y-0.5 mr-2">
              <li dir="ltr" className="text-right">24.7136, 46.6753</li>
              <li dir="ltr" className="text-right">https://maps.google.com/...@24.71,46.67...</li>
              <li dir="ltr" className="text-right">https://maps.app.goo.gl/...</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
