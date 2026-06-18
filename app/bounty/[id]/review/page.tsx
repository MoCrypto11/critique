"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { BountyStatusBadge } from "@/components/BountyStatusBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmptyState } from "@/components/EmptyState";
import { FounderAccess, FounderGate } from "@/components/FounderGate";
import { formatUSDC, getFeedbackTypeLabel, getRewardForType, normalizeFeedbackRewards } from "@/lib/feedbackRewards";
import { BountyMetadata, FeedbackSubmission, getLocalBounty, listSubmissions } from "@/lib/storage";
import { cn, isFounderWallet, shortAddress } from "@/lib/utils";

type Filter = "pending" | "approved" | "rejected" | "all";

const PAGE = 25;

const reviewGrid =
  "md:grid md:grid-cols-[minmax(0,1.3fr)_6rem_6.5rem_6rem_5rem_5.5rem] md:items-center md:gap-3";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function FilterTab({
  value,
  active,
  count,
  onClick,
  children
}: {
  value: Filter;
  active: Filter;
  count: number;
  onClick: (value: Filter) => void;
  children: string;
}) {
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition-colors sm:flex-none",
        isActive ? "bg-action text-white" : "text-muted hover:text-ink"
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none",
          isActive ? "bg-white/20 text-white" : "bg-white/10 text-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const { address, isConnected } = useAccount();
  const [bounty, setBounty] = useState<BountyMetadata>();
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [limit, setLimit] = useState(PAGE);
  const [publicLink, setPublicLink] = useState("");

  // Founder gate: load the bounty first, and only fetch submissions when the
  // connected wallet is the founder. Non-founders never receive submission data.
  const refresh = useCallback(async () => {
    const nextBounty = await getLocalBounty(params.id);
    setBounty(nextBounty);
    if (nextBounty && isFounderWallet(nextBounty.founderAddress, address)) {
      setSubmissions(await listSubmissions(params.id));
    } else {
      setSubmissions([]);
    }
    setIsLoaded(true);
  }, [params.id, address]);

  useEffect(() => {
    void refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load submissions.");
      setIsLoaded(true);
    });
  }, [refresh]);

  useEffect(() => {
    if (typeof window !== "undefined") setPublicLink(`${window.location.origin}/bounty/${params.id}`);
  }, [params.id]);

  useEffect(() => {
    setLimit(PAGE);
  }, [filter]);

  const counts = useMemo(
    () => ({
      pending: submissions.filter((submission) => submission.status === "pending").length,
      approved: submissions.filter((submission) => submission.status === "approved").length,
      rejected: submissions.filter((submission) => submission.status === "rejected").length,
      all: submissions.length
    }),
    [submissions]
  );

  const rewardConfig = bounty
    ? normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
        (reward) => reward.enabled !== false
      )
    : [];

  function rewardLabel(submission: FeedbackSubmission) {
    const configured = getRewardForType(rewardConfig, submission.feedbackType);
    const amount = submission.expectedRewardUSDC || configured?.rewardUSDC || bounty?.rewardUSDC;
    const formatted = amount ? formatUSDC(amount) : "Not set";
    return formatted === "Not set" ? "—" : `${formatted} USDC`;
  }

  const visible = useMemo(() => {
    const sorted = [...submissions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return filter === "all" ? sorted : sorted.filter((submission) => submission.status === filter);
  }, [submissions, filter]);

  const walletConnected = Boolean(address) || isConnected;
  const access: FounderAccess = !isLoaded
    ? "loading"
    : !bounty
      ? "not-found"
      : !walletConnected
        ? "no-wallet"
        : !isFounderWallet(bounty.founderAddress, address)
          ? "not-founder"
          : "authorized";

  if (access !== "authorized") {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <FounderGate access={access} bountyId={params.id} />
        </main>
      </>
    );
  }

  const shown = visible.slice(0, limit);

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Founder review</p>
            <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Review submissions</h1>
            <p className="mt-3 text-base leading-7 text-muted">{bounty?.title || "Local bounty"}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {publicLink ? <CopyLinkButton href={publicLink} label="Copy public link" /> : null}
            <Link href={`/bounty/${params.id}`} className="btn-secondary w-full sm:w-auto" title="Preview the contributor page">
              Public page
            </Link>
            <Link href={`/bounty/${params.id}/dashboard`} className="btn-secondary w-full sm:w-auto">
              Funding &amp; receipts
            </Link>
          </div>
        </div>

        {error ? <div className="notice mb-5 mt-6 border-red-400/30 bg-red-500/10 font-semibold text-red-200">{error}</div> : null}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">Pending</p>
            <p className="mt-1.5 text-2xl font-black text-ink">{counts.pending}</p>
          </div>
          <div className="surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">Approved</p>
            <p className="mt-1.5 text-2xl font-black text-action">{counts.approved}</p>
          </div>
          <div className="surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">Rejected</p>
            <p className="mt-1.5 text-2xl font-black text-ink">{counts.rejected}</p>
          </div>
          <div className="surface-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">Total</p>
            <p className="mt-1.5 text-2xl font-black text-ink">{counts.all}</p>
          </div>
        </div>

        <div className="mt-5 inline-flex w-full rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:w-auto">
          <FilterTab value="pending" active={filter} count={counts.pending} onClick={setFilter}>
            Pending
          </FilterTab>
          <FilterTab value="approved" active={filter} count={counts.approved} onClick={setFilter}>
            Approved
          </FilterTab>
          <FilterTab value="rejected" active={filter} count={counts.rejected} onClick={setFilter}>
            Rejected
          </FilterTab>
          <FilterTab value="all" active={filter} count={counts.all} onClick={setFilter}>
            All
          </FilterTab>
        </div>

        <section className="surface mt-5 p-4 sm:p-5">
          {!isLoaded ? (
            <EmptyState title="Loading submissions" body="Preparing the founder review queue." />
          ) : shown.length ? (
            <div>
              <div
                className={cn(
                  "hidden px-2.5 pb-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-muted",
                  reviewGrid
                )}
              >
                <span>Contributor</span>
                <span className="text-center">Status</span>
                <span className="text-center">Submitted</span>
                <span className="text-center">Reward</span>
                <span className="text-center">Payout</span>
                <span className="text-right">Action</span>
              </div>
              <div className="space-y-2.5 md:space-y-0">
                {shown.map((submission) => (
                  <Link
                    key={submission.id}
                    href={`/bounty/${params.id}/review/${submission.id}`}
                    className={cn(
                      "focus-ring block rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5 transition-colors hover:border-action/30 hover:bg-white/[0.045] md:rounded-none md:border-0 md:border-t md:border-white/[0.06] md:bg-transparent md:p-2.5 md:first:border-t-0 md:hover:bg-white/[0.03]",
                      reviewGrid
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-black text-ink">{shortAddress(submission.testerWallet)}</p>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-muted">
                        {submission.feedbackTypeLabel || getFeedbackTypeLabel(submission.feedbackType)}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0 md:flex md:justify-center">
                      <BountyStatusBadge status={submission.status} />
                    </div>
                    <div className="mt-2 text-xs text-muted md:mt-0 md:text-center">
                      <span className="font-bold md:hidden">Submitted · </span>
                      {formatDate(submission.createdAt)}
                    </div>
                    <div className="mt-2 text-xs font-black text-action md:mt-0 md:text-center">
                      <span className="font-bold text-muted md:hidden">Reward · </span>
                      {rewardLabel(submission)}
                    </div>
                    <div className="mt-2 md:mt-0 md:text-center">
                      <span className="text-[11px] font-bold text-muted md:hidden">Payout · </span>
                      {submission.payoutTxHash ? (
                        <span className="inline-flex rounded-full border border-action/25 bg-action/10 px-2 py-0.5 text-[10px] font-black text-action">
                          Paid
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-muted">—</span>
                      )}
                    </div>
                    <div className="mt-3 md:mt-0 md:text-right">
                      <span className="inline-flex items-center rounded-md border border-action/40 bg-action/15 px-2.5 py-1 text-[11px] font-black text-action">
                        Review
                        <span aria-hidden="true" className="ml-1">→</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {visible.length > limit ? (
                <div className="mt-4 flex justify-center">
                  <button type="button" onClick={() => setLimit((value) => value + PAGE)} className="btn-secondary">
                    Show more ({visible.length - limit} remaining)
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title={filter === "all" ? "No feedback yet" : `No ${filter} submissions`}
              body={
                filter === "all"
                  ? "Share the public bounty link with contributors."
                  : "Switch tabs to see submissions in other states."
              }
            />
          )}
        </section>
      </main>
    </>
  );
}
