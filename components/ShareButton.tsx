"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Props {
  lat: number;
  lng: number;
  propertyType?: string;
  area?: number;
  district?: string;
}

export default function ShareButton({ lat, lng, propertyType, area, district }: Props) {
  const { lang } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    try {
      const payload = JSON.stringify({ lat, lng, ...(propertyType ? { propertyType } : {}), ...(area ? { area } : {}), ...(district ? { district } : {}) });
      const encoded = btoa(unescape(encodeURIComponent(payload)));
      const url = `${window.location.origin}/?share=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch {
      // fallback: copy current URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
        copied
          ? "bg-green-50 border-green-300 text-green-700"
          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {lang === "en" ? "Link copied!" : "تم نسخ الرابط!"}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {lang === "en" ? "Share Report" : "شارك التقرير"}
        </>
      )}
    </button>
  );
}
