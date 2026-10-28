import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no browser requests to Google (CSP font-src 'self').
// Two families max (DESIGN_DIRECTION §3): Geist for text/UI, Bricolage Grotesque for display
// [Recommendation: first candidate in §3; swap here if the owner prefers another].
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Width axis gives the condensed "tin sign" lettering without a third family.
const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin"], axes: ["wdth", "opsz"] });

export const metadata: Metadata = {
  title: { default: "Chai Tapri, Northbridge", template: "%s · Chai Tapri" },
  description: "Cutting chai, bun maska and vada pav at Shop 6/189 William St, Northbridge WA 6003.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${geistSans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
