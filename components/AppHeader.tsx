"use client";

import Image from "next/image";
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
    <header className="sticky top-0 z-30 border-b border-line/50 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[68px] max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-4 md:gap-5">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black leading-none tracking-normal text-ink">
            <Image
              src="/brand/critique-icon.svg"
              alt="Critique"
              width={40}
              height={23}
              priority
              className="h-auto w-10 shrink-0 object-contain"
            />
            <span>Critique</span>
          </Link>
          <nav className="flex min-h-11 items-center gap-1 rounded-xl border border-line/60 bg-white/70 p-1 text-sm font-bold leading-none text-muted">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-9 items-center rounded-lg px-3.5 py-2 hover:bg-panel hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex md:justify-end">
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
