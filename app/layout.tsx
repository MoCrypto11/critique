import type { Metadata } from "next";
import { Manrope, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { BuiltOnArcBadge } from "@/components/BuiltOnArcBadge";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers";

// Manrope = body/site default. Space Grotesk = hero display headline only.
// Space Mono = small uppercase eyebrows/labels.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk"
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono"
});

export const metadata: Metadata = {
  title: "Critique",
  description: "Pay real users for useful product feedback.",
  icons: {
    icon: "/brand/critique-favicon-final.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="bg-[#fbfcf8] antialiased">
        <Providers>
          {children}
          <BuiltOnArcBadge />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
