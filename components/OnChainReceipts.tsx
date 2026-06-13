"use client";

import { type ReactNode, useState } from "react";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ARC_EXPLORER_URL } from "@/lib/arc";
import { formatUSDC, normalizeRewardAmount } from "@/lib/feedbackRewards";
import { BountyMetadata, FeedbackSubmission } from "@/lib/storage";
import { shortAddress } from "@/lib/utils";

const PAYOUT_PAGE = 4;

const receiptPill =
  "focus-ring inline-flex items-center justify-center rounded-md border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-ink transition-colors hover:border-action/40 hover:text-action";

// Compact, copyable transaction row — shortened hash only, never a giant full
// hash. Copy + View-on-explorer wrap below the hash on narrow screens.
function HashRow({ hash, label, sub }: { hash: string; label?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2">
      <div className="min-w-0">
        {label ? <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted">{label}</p> : null}
        <p className="font-mono text-xs font-bold text-ink">{shortAddress(hash)}</p>
        {sub ? <p className="mt-0.5 truncate text-[10px] text-muted">{sub}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <CopyLinkButton href={hash} label="Copy" className={receiptPill} />
        <a
          href={`${ARC_EXPLORER_URL}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className={receiptPill}
          title="View on Arc Explorer"
        >
          View
          <span aria-hidden="true" className="ml-1">↗</span>
        </a>
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-action">{children}</h3>;
}

export function OnChainReceipts({
  bounty,
  submissions,
  rewardFor
}: {
  bounty: BountyMetadata;
  submissions: FeedbackSubmission[];
  rewardFor: (submission: FeedbackSubmission) => string;
}) {
  const [showAllPayouts, setShowAllPayouts] = useState(false);

  // Only real, recorded data — funding/lifecycle hashes from the bounty and
  // payout hashes from approved submissions. Nothing is generated here.
  const fundingTxs = bounty.txHashes ?? [];
  const payouts = submissions.filter((submission) => submission.status === "approved" && submission.payoutTxHash);
  const totalPaid = payouts.reduce((sum, submission) => sum + normalizeRewardAmount(rewardFor(submission)), 0);
  const visiblePayouts = showAllPayouts ? payouts : payouts.slice(0, PAYOUT_PAGE);
  const isClosed = bounty.status === "closed";

  return (
    <section id="on-chain-receipts" className="surface scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-lg font-black text-ink">On-chain receipts</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
        On-chain receipts show funding and payout transactions. Feedback content stays off-chain.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="surface-soft rounded-xl p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted">Approved payouts</p>
          <p className="mt-1.5 text-2xl font-black leading-none text-ink">{payouts.length}</p>
          {totalPaid > 0 ? (
            <p className="mt-1.5 text-xs font-bold text-action">{formatUSDC(totalPaid)} USDC paid</p>
          ) : null}
        </div>
        <div className="surface-soft rounded-xl p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted">Contract bounty ID</p>
          <p className="mt-1.5 font-mono text-2xl font-black leading-none text-ink">
            {bounty.contractBountyId ? `#${bounty.contractBountyId}` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SubHeading>Funding &amp; bounty transactions</SubHeading>
        <p className="mt-1 text-xs leading-5 text-muted">
          The funding transaction, plus any close or refund recorded on-chain.
        </p>
        <div className="mt-3 space-y-2">
          {fundingTxs.length ? (
            fundingTxs.map((hash) => <HashRow key={hash} hash={hash} />)
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-muted">
              No funding transaction yet.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <SubHeading>Payout history</SubHeading>
        <div className="mt-3 space-y-2">
          {payouts.length ? (
            <>
              {visiblePayouts.map((submission) => (
                <HashRow
                  key={submission.id}
                  hash={submission.payoutTxHash as string}
                  sub={`To ${shortAddress(submission.testerWallet)} · ${formatUSDC(rewardFor(submission))} USDC`}
                />
              ))}
              {payouts.length > PAYOUT_PAGE ? (
                <button type="button" onClick={() => setShowAllPayouts((value) => !value)} className={`${receiptPill} w-full`}>
                  {showAllPayouts ? "Show fewer" : `Show all ${payouts.length} payouts`}
                </button>
              ) : null}
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-muted">
              No approved payouts yet.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <SubHeading>Refund / close</SubHeading>
        <p className="mt-2 text-xs leading-5 text-muted">
          {isClosed
            ? "Bounty closed on-chain — its close and refund transactions are listed under Funding & bounty transactions above."
            : "No refund transaction yet."}
        </p>
      </div>
    </section>
  );
}
