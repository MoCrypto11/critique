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
    <header className="bg-transparent">
      <div className="mx-auto grid min-h-[72px] max-w-6xl grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 lg:px-8 lg:py-0">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 text-[28px] font-black leading-none tracking-normal text-ink"
        >
          <Image
            src="/brand/critique-icon-final.svg"
            alt="Critique"
            width={55}
            height={55}
            priority
            className="h-auto w-[55px] shrink-0 object-contain"
          />
          <span>Critique</span>
        </Link>
        <nav className="order-3 col-span-2 flex items-center gap-7 text-[15px] font-semibold leading-none text-muted sm:gap-9 lg:order-none lg:col-span-1 lg:justify-self-center">
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
        <div className="flex shrink-0 items-center justify-self-end">
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
