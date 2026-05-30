import type { Metadata } from "next";
import { EB_Garamond, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";

const metadataBase = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL) : undefined;

const serifFont = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"]
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "A Manifesto for an Open Future — The Declaration",
  description: "The Drupal Pivot declaration and live signatories page.",
  metadataBase
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${serifFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  );
}