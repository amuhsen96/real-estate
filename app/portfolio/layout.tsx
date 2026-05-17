import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Abdullah Muhsen | Senior Data Analyst",
  description:
    "Senior Data Analyst with 7+ years of experience in data solutions, BI dashboards, and analytics.",
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{children}</body>
    </html>
  );
}
