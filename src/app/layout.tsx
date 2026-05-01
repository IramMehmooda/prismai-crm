import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getSession } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "prismAI — Industrial Sales & Marketing CRM",
  description: "The intelligent CRM for industrial manufacturers — pipeline, quotes, VAT/ZATCA-ready, bilingual.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const locale = (session?.locale as "en" | "ar") ?? "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
