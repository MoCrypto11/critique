import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { BuiltOnArcBadge } from "@/components/BuiltOnArcBadge";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope"
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
    <html lang="en" className={manrope.variable}>
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
