"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

export function AppHeader() {
  const pathname = usePathname();
  const isBountyRoute = pathname.startsWith("/bounty/");
  const navLinks = isBountyRoute
    ? [
        { href: "/", label: "Explore" },
        { href: "/create", label: "Create" }
      ]
    : [
        { href: "/#how-it-works", label: "How it works" },
        { href: "/create", label: "Create" },
        { href: "/#faq", label: "FAQ" }
      ];

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-black tracking-normal text-ink">
            <span className="grid size-9 place-items-center rounded-lg bg-[#0b2f29] text-sm font-black text-[#f8f5eb] shadow-sm">
              CQ
            </span>
            <span>Critique</span>
          </Link>
          <nav className="flex items-center gap-1 rounded-lg border border-line/70 bg-white/85 p-1 text-sm font-bold text-muted shadow-sm">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 hover:bg-panel hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="md:flex md:justify-end">
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
