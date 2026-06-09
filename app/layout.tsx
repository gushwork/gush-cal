import type { Metadata } from "next";
import { Host_Grotesk, Inter } from "next/font/google";
import { BrandStyles } from "@/components/brand/brand-styles";
import { AppToaster } from "@/components/ui/toaster";
import { buildRootMetadata } from "@/lib/brand/metadata";
import { getBrandConfig } from "@/lib/brand/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const grotesk = Host_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = getBrandConfig();
  return buildRootMetadata({
    description: "Schedule panel interviews with pooled availability",
    icons: {
      icon: brand.faviconUrl,
    },
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} min-h-screen antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <BrandStyles />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
