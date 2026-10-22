import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no browser requests to Google (CSP font-src 'self').
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chai Tapri, Northbridge",
  description: "Chai Tapri, Shop 6/189 William St, Northbridge WA 6003.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
