import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { platformName } from "@/lib/config/platform";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: platformName,
    template: `%s | ${platformName}`,
  },
  description: "SaaS multi-tenant para fast-food con marketplace multi-marca, storefront, admin y kitchen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
