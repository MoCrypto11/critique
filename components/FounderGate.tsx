"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { WalletConnect } from "@/components/WalletConnect";

export type FounderAccess = "loading" | "no-wallet" | "not-founder" | "not-found" | "authorized";

// Shared access notice for founder-only pages. Rendered instead of any
// founder content whenever access !== "authorized", so submission data is
// never loaded or shown to non-founders.
export function FounderGate({
  access,
  bountyId,
  publicHref,
  entityLabel = "bounty"
}: {
  access: FounderAccess;
  bountyId: string;
  publicHref?: string;
  entityLabel?: string;
}) {
  if (access === "loading") {
    return <EmptyState title="Checking founder access" body={`Verifying that this wallet owns the ${entityLabel}.`} />;
  }
  if (access === "not-found") {
    return <EmptyState title={`${entityLabel === "campaign" ? "Campaign" : "Bounty"} not found`} body="Create one or try the example bounty." />;
  }

  const isNoWallet = access === "no-wallet";
  const href = publicHref || `/bounty/${bountyId}`;

  return (
    <section className="mx-auto max-w-2xl">
      <div className="surface glow-card p-8 text-center sm:p-10">
        <span className="icon-chip mx-auto mb-5 grid size-12 place-items-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="font-display text-2xl tracking-normal text-ink sm:text-3xl">
          {isNoWallet ? "Connect founder wallet" : `This wallet is not the founder for this ${entityLabel}.`}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-muted">
          {isNoWallet
            ? `This is a private founder page. Connect the wallet that created this ${entityLabel} to review submissions and feedback.`
            : `Only the wallet that created this ${entityLabel} can review its submissions. Switch to the founder wallet to continue.`}
        </p>
        <div className="mt-6 flex justify-center">
          <WalletConnect />
        </div>
        <div className="mt-4">
          <Link
            href={href}
            className="text-sm font-black text-muted underline-offset-4 transition-colors hover:text-action hover:underline"
          >
            View the public {entityLabel} page
          </Link>
        </div>
      </div>
    </section>
  );
}
