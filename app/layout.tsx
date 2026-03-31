import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Property Location Analyzer | محلل موقع العقار",
  description: "تحليل موقع العقار - صور جوية، أنشطة محيطة، وتقديرات أسعار",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // القيم الافتراضية للعربية — تُحدَّث ديناميكياً عبر I18nProvider
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
          integrity="sha512-h9FcoyWjHcOcmEEnphOaQto9x1SQSliGBGlDA3EoVYDBSdBQ+afNx/nYakdd4QNnGBIiN9cjTZGJsBhISBANRQ=="
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
