import type { Metadata, Viewport } from "next";
import * as React from "react";
import { GoogleTagManager } from '@next/third-parties/google'
// import { Google_Sans } from "next/font/google";
import 'material-symbols';
import Header from "@/components/header";
import Footer from "@/components/footer";
import Providers from "@/components/providers";
import { metadataBase } from "@/lib/metadata";
import "./globals.css";

// const body = Google_Sans({
//   subsets: ["latin"],
//   variable: "--font-body",
//   weight: ["400", "500", "600", "700", "800"],
//   display: "swap",
// });

export const metadata: Metadata = {
  metadataBase,
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
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap"
        rel="stylesheet"
      />
    </head>
    {/*<body className={`${body.variable} ${display.variable} antialiased`}>*/}
    <GoogleTagManager gtmId="GTM-MQJD3BQN" />
    <body className={`antialiased`}>
      <Providers>
        <div className="page">
          <Header />
          {children}
          <Footer />
        </div>
      </Providers>
    </body>
    </html>
  );
}
