"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ENABLE_CAMPAIGNS } from "@/lib/campaigns";
import { WalletConnect } from "./WalletConnect";

export function AppHeader() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const walletConnected = Boolean(address) || isConnected;
  const isBountyRoute = pathname.startsWith("/bounty/");
  const baseNavLinks = isBountyRoute
    ? [
        { href: "/", label: "Explore" },
        { href: "/create", label: "Create" }
      ]
    : [
        { href: "/#how-it-works", label: "How it works" },
        { href: "/create", label: "Create" },
        { href: "/#faq", label: "FAQ" }
      ];
  const withCampaigns = ENABLE_CAMPAIGNS ? [...baseNavLinks, { href: "/campaigns/new", label: "Campaigns" }] : baseNavLinks;
  const navLinks = walletConnected ? [...withCampaigns, { href: "/dashboard", label: "Dashboard" }] : withCampaigns;

  return (
    <header className="bg-transparent">
      <div className="mx-auto grid min-h-[72px] max-w-7xl grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 lg:px-8 lg:py-0">
        <Link
          href="/"
          className="flex min-w-0 translate-y-0.5 items-center gap-2.5 text-[24px] font-black leading-none tracking-normal text-ink sm:translate-y-1 sm:gap-3 sm:text-[36px]"
        >
          <Image
            src="/brand/critique-icon-final.svg"
            alt="Critique"
            width={70}
            height={70}
            priority
            className="h-auto w-[46px] shrink-0 object-contain sm:w-[70px]"
          />
          <span>Critique</span>
        </Link>
        <nav className="order-3 col-span-2 flex items-center justify-center gap-4 text-[13px] font-semibold leading-none text-muted sm:gap-9 sm:text-[15px] lg:order-none lg:col-span-1 lg:justify-self-center">
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
