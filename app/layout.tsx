import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";

import { AppToaster } from "@/components/ui/app-toaster";
import { platformName } from "@/lib/config/platform";

import "./globals.css";

// Roboto isn't a variable font on Google Fonts, so next/font needs the explicit weight list --
// covers every Tailwind font-weight utility actually used across the app (normal/medium/bold);
// font-semibold (600) falls back to the nearest loaded weight since Roboto has no static 600.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
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
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
