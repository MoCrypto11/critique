import type { Metadata } from "next";
import "./globals.css";
import { BuiltOnArcBadge } from "@/components/BuiltOnArcBadge";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Critique",
  description: "Pay real users for useful product feedback.",
  icons: {
    icon: "/brand/critique-favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
