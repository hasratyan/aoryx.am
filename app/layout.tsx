import type { Metadata, Viewport } from "next";
import * as React from "react";
import { GoogleTagManager } from '@next/third-parties/google'
import { Google_Sans } from "next/font/google";
// import 'material-symbols';
import Providers from "@/components/providers";
import { metadataBase } from "@/lib/metadata";
import "./globals.css";

const body = Google_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase,
  openGraph: {
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({children,}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
    <body className={`${body.variable} antialiased`}>
    <GoogleTagManager gtmId="GTM-MQJD3BQN" />
      <Providers>{children}</Providers>
    </body>
    </html>
  );
}
