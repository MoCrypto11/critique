"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { BountyStatusBadge } from "@/components/BountyStatusBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmptyState } from "@/components/EmptyState";
import { TxHashLink } from "@/components/TxHashLink";
import { WalletConnect } from "@/components/WalletConnect";
import {
  formatUSDC,
  getFeedbackTypeLabel,
  getRewardForType,
  getTargetRewardTotalUSDC,
  getTotalRewardSlots,
  normalizeFeedbackRewards
} from "@/lib/feedbackRewards";
import {
  BountyMetadata,
  FeedbackSubmission,
  listBountiesByFounder,
  listBountiesByIds,
  listSubmissions,
  listSubmissionsByTester
} from "@/lib/storage";

type Tab = "created" | "contributions";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function fundingSummary(bounty: BountyMetadata) {
  const rewards = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
    (reward) => reward.enabled !== false
  );
  const total = getTargetRewardTotalUSDC(rewards);
  const slots = getTotalRewardSlots(rewards);
  return `${formatUSDC(total)} testnet USDC across ${slots} slot${slots === 1 ? "" : "s"}`;
}

function rewardForSubmission(submission: FeedbackSubmission, bounty?: BountyMetadata) {
  if (submission.expectedRewardUSDC) return submission.expectedRewardUSDC;
  if (!bounty) return undefined;
  const rewards = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions);
  return getRewardForType(rewards, submission.feedbackType)?.rewardUSDC || bounty.rewardUSDC;
}

function statusMessage(submission: FeedbackSubmission) {
  if (submission.status === "approved" && submission.payoutTxHash) return "Payout sent";
  if (submission.status === "approved") return "Approved";
  if (submission.status === "rejected") return "Not approved";
  return "Waiting for founder review";
}

function TabButton({
  value,
  activeTab,
  onClick,
  children
}: {
  value: Tab;
  activeTab: Tab;
  onClick: (value: Tab) => void;
  children: ReactNode;
}) {
  const isActive = activeTab === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`focus-ring min-h-11 rounded-xl px-3 py-2 text-center text-xs font-black transition-colors sm:px-4 sm:text-sm ${
        isActive ? "bg-action text-white" : "text-muted hover:bg-panel hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CreatedBountyCard({
  bounty,
  submissions,
  publicLink
}: {
  bounty: BountyMetadata;
  submissions: FeedbackSubmission[];
  publicLink: string;
}) {
  const approved = submissions.filter((submission) => submission.status === "approved").length;
  const pending = submissions.filter((submission) => submission.status === "pending").length;

  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BountyStatusBadge status={bounty.status} />
            <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-black text-muted">
              {formatDate(bounty.createdAt)}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-black leading-snug text-ink">{bounty.title}</h3>
          {bounty.productUrl ? (
            <a
              href={bounty.productUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-sm font-bold text-action underline-offset-4 hover:underline"
            >
              {bounty.productUrl}
            </a>
          ) : null}
          <p className="mt-3 text-sm font-bold text-action">{fundingSummary(bounty)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="surface-soft p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Submissions</p>
          <p className="mt-2 text-2xl font-black text-ink">{submissions.length}</p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Approved</p>
          <p className="mt-2 text-2xl font-black text-action">{approved}</p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Pending</p>
          <p className="mt-2 text-2xl font-black text-ink">{pending}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <CopyLinkButton href={publicLink} label="Copy bounty link" />
        <Link href={`/bounty/${bounty.id}/review`} className="btn-secondary w-full sm:w-auto">
          Review submissions
        </Link>
        <Link href={`/bounty/${bounty.id}/dashboard`} className="btn-primary w-full sm:w-auto">
          Open dashboard
        </Link>
      </div>
    </article>
  );
}

function ContributionCard({
  submission,
  bounty
}: {
  submission: FeedbackSubmission;
  bounty?: BountyMetadata;
}) {
  const reward = rewardForSubmission(submission, bounty);

  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-action/25 bg-action/10 px-3 py-1 text-xs font-black text-action">
              {submission.feedbackTypeLabel || getFeedbackTypeLabel(submission.feedbackType)}
            </span>
            <BountyStatusBadge status={submission.status} />
          </div>
          <h3 className="mt-4 text-xl font-black leading-snug text-ink">
            {bounty?.title || "Feedback bounty"}
          </h3>
          <p className="mt-2 text-sm font-bold text-action">{statusMessage(submission)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Submitted {formatDate(submission.createdAt)}
          </p>
        </div>
        {reward ? (
          <div className="rounded-xl border border-action/20 bg-action/10 px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-action">Expected reward</p>
            <p className="mt-1 text-sm font-black text-ink">{formatUSDC(reward)} testnet USDC</p>
          </div>
        ) : null}
      </div>

      {submission.payoutTxHash ? (
        <div className="mt-5 rounded-xl border border-action/20 bg-action/10 p-4 text-sm font-semibold text-action">
          Payout transaction: <TxHashLink hash={submission.payoutTxHash} />
        </div>
      ) : null}

      {submission.rejectionReason ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Rejection note: {submission.rejectionReason}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href={`/bounty/${submission.bountyId}`} className="btn-secondary w-full sm:w-auto">
          Open bounty
        </Link>
      </div>
    </article>
  );
}

export default function WalletDashboardPage() {
  const { address, isConnected } = useAccount();
  const walletConnected = Boolean(address) || isConnected;
  const [activeTab, setActiveTab] = useState<Tab>("created");
  const [createdBounties, setCreatedBounties] = useState<BountyMetadata[]>([]);
  const [contributions, setContributions] = useState<FeedbackSubmission[]>([]);
  const [submissionsByBounty, setSubmissionsByBounty] = useState<Record<string, FeedbackSubmission[]>>({});
  const [bountiesById, setBountiesById] = useState<Record<string, BountyMetadata>>({});
  const [origin, setOrigin] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  const dashboardCounts = useMemo(
    () => ({
      created: createdBounties.length,
      contributions: contributions.length
    }),
    [createdBounties.length, contributions.length]
  );

  const loadDashboard = useCallback(async () => {
    if (!address) {
      setCreatedBounties([]);
      setContributions([]);
      setSubmissionsByBounty({});
      setBountiesById({});
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    setError("");

    try {
      const [nextBounties, nextContributions] = await Promise.all([
        listBountiesByFounder(address),
        listSubmissionsByTester(address)
      ]);
      const submissionPairs = await Promise.all(
        nextBounties.map(async (bounty) => [bounty.id, await listSubmissions(bounty.id)] as const)
      );
      const relatedBounties = await listBountiesByIds(nextContributions.map((submission) => submission.bountyId));

      setCreatedBounties(nextBounties);
      setContributions(nextContributions);
      setSubmissionsByBounty(Object.fromEntries(submissionPairs));
      setBountiesById(Object.fromEntries(relatedBounties.map((bounty) => [bounty.id, bounty])));
    } catch (caught) {
      console.error("[Critique dashboard] load failed", caught);
      setError("Could not load your dashboard. Please try again.");
    } finally {
      setIsLoaded(true);
    }
  }, [address]);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        {!walletConnected ? (
          <section className="mx-auto max-w-2xl">
            <div className="surface p-8 text-center sm:p-10">
              <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full border border-action/20 bg-action/10 text-sm font-black text-action">
                CQ
              </div>
              <h1 className="font-display text-3xl tracking-normal text-ink sm:text-4xl">Connect your wallet</h1>
              <p className="mx-auto mt-3 max-w-md text-base leading-7 text-muted">
                Connect the wallet you used to create bounties or submit feedback.
              </p>
              <div className="mt-6 flex justify-center">
                <WalletConnect />
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Wallet dashboard</p>
                <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">
                  My Critique dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                  Track the bounties you created and the feedback you submitted.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 rounded-2xl border border-line/70 bg-white p-1 sm:w-auto">
                <TabButton value="created" activeTab={activeTab} onClick={setActiveTab}>
                  Created bounties
                </TabButton>
                <TabButton value="contributions" activeTab={activeTab} onClick={setActiveTab}>
                  My contributions
                </TabButton>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="surface-soft p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Created bounties</p>
                <p className="mt-2 text-2xl font-black text-ink">{dashboardCounts.created}</p>
              </div>
              <div className="surface-soft p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Submitted feedback</p>
                <p className="mt-2 text-2xl font-black text-ink">{dashboardCounts.contributions}</p>
              </div>
            </div>

            {error ? <div className="notice mb-5 border-red-200 bg-red-50 font-semibold text-red-700">{error}</div> : null}

            {!isLoaded ? (
              <EmptyState title="Loading dashboard" body="Preparing your bounties and contributions." />
            ) : activeTab === "created" ? (
              <section className="grid gap-5">
                {createdBounties.length ? (
                  createdBounties.map((bounty) => (
                    <CreatedBountyCard
                      key={bounty.id}
                      bounty={bounty}
                      submissions={submissionsByBounty[bounty.id] || []}
                      publicLink={`${origin || ""}/bounty/${bounty.id}`}
                    />
                  ))
                ) : (
                  <div className="surface-soft border-dashed p-8 text-center">
                    <h2 className="text-base font-black text-ink">You have not created any bounties yet.</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                      Create a focused feedback bounty and it will appear here for easy review.
                    </p>
                    <div className="mt-5">
                      <Link href="/create" className="btn-primary">
                        Create a bounty
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="grid gap-5">
                {contributions.length ? (
                  contributions.map((submission) => (
                    <ContributionCard
                      key={submission.id}
                      submission={submission}
                      bounty={bountiesById[submission.bountyId]}
                    />
                  ))
                ) : (
                  <div className="surface-soft border-dashed p-8 text-center">
                    <h2 className="text-base font-black text-ink">You have not submitted feedback yet.</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                      Try the example bounty to see how contributor submissions are tracked.
                    </p>
                    <div className="mt-5">
                      <Link href="/bounty/demo" className="btn-secondary">
                        Preview bounty link
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
