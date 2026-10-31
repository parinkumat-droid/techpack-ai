import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://freeaitechpacker.vercel.app";
const DESCRIPTION =
  "Upload a garment photo and get a factory-ready tech pack in minutes: callouts, size sheet, bill of materials and a PDF. Built for small fashion brands.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FreeAITechPacker",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "FreeAITechPacker",
    title: "FreeAITechPacker: AI tech packs from a garment photo",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "FreeAITechPacker: AI tech packs from a garment photo",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
