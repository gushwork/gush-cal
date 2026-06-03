import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { BrandStyles } from "@/components/brand/brand-styles";
import { buildRootMetadata } from "@/lib/brand/metadata";
import { getBrandConfig } from "@/lib/brand/config";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  preload: true,
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
  const brand = getBrandConfig();

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <head>
        {brand.fontDisplay && (
          <link
            rel="preload"
            as="style"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.fontDisplay).replace(/ /g, "+")}:wght@400;600;700&display=swap`}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <BrandStyles />
        {children}
      </body>
    </html>
  );
}
