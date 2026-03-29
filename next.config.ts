import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  serverExternalPackages: ["html2canvas", "jspdf"],
  turbopack: {
    resolveAlias: {
      // html2canvas لا يملك حقل exports — نوجّه Turbopack مباشرة للملف
      "html2canvas": "./node_modules/html2canvas/dist/html2canvas.esm.js",
    },
  },
};

export default nextConfig;
