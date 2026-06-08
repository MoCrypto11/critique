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
    <header className="sticky top-0 z-30 border-b border-line/20 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-x-9 gap-y-3">
          <Link href="/" className="flex items-center gap-3 text-xl font-black leading-none tracking-normal text-ink">
            <Image
              src="/brand/critique-icon.svg"
              alt="Critique"
              width={48}
              height={28}
              priority
              className="h-auto w-12 shrink-0 object-contain"
            />
            <span>Critique</span>
          </Link>
          <nav className="flex items-center gap-7 text-[15px] font-semibold leading-none text-muted sm:gap-9">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2 transition-colors hover:text-action"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center">
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
