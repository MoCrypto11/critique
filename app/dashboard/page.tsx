"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { BountyStatusBadge } from "@/components/BountyStatusBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";
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
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function fundingSummary(bounty: BountyMetadata) {
  const rewards = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
    (reward) => reward.enabled !== false
  );
  const total = getTargetRewardTotalUSDC(rewards);
  const slots = getTotalRewardSlots(rewards);
  return `${formatUSDC(total)} testnet USDC · ${slots} slot${slots === 1 ? "" : "s"}`;
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

// Compact action controls used across the dashboard rows.
const actionLink =
  "focus-ring inline-flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-ink transition-colors hover:border-action/40 hover:text-action";
const actionLinkPrimary =
  "focus-ring inline-flex items-center justify-center rounded-lg border border-action/40 bg-action px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-actionHover";

/* ── Icons (small inline SVGs, mint stroke via currentColor) ─────────────── */
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path d="m3 13 9 5 9-5" strokeLinejoin="round" />
    </svg>
  );
}
function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M4 13h4l1.5 3h5L16 13h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13 7 5h10l2 8v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5Z" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="surface glow-card p-5">
      <span className="icon-chip size-10">{icon}</span>
      <p className="mt-4 text-3xl font-black leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}

function Panel({
  title,
  count,
  action,
  className,
  children
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("surface flex flex-col p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">{title}</h2>
          {typeof count === "number" ? (
            <span className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[11px] font-black text-muted">
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}

function PanelEmpty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="surface-soft flex flex-1 flex-col items-center justify-center rounded-xl border-dashed p-6 text-center">
      <p className="max-w-xs text-sm leading-6 text-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1].map((row) => (
        <div key={row} className="surface-soft rounded-xl p-4">
          <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-3 w-1/3 animate-pulse rounded-full bg-white/[0.07]" />
          <div className="mt-4 h-7 w-1/2 animate-pulse rounded-lg bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function CreatedBountyRow({
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
    <article className="surface-soft rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-black text-ink" title={bounty.title}>
          {bounty.title}
        </h3>
        <BountyStatusBadge status={bounty.status} />
      </div>
      <p className="mt-1.5 text-xs font-bold text-action">{fundingSummary(bounty)}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-black uppercase tracking-[0.12em] text-muted">
        <span>
          <span className="text-ink">{submissions.length}</span> submissions
        </span>
        <span>
          <span className="text-action">{approved}</span> approved
        </span>
        <span>
          <span className="text-ink">{pending}</span> pending
        </span>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <CopyLinkButton href={publicLink} label="Copy link" className={actionLink} />
        <Link href={`/bounty/${bounty.id}/review`} className={actionLink}>
          Review
        </Link>
        <Link href={`/bounty/${bounty.id}/dashboard`} className={actionLinkPrimary}>
          Open
        </Link>
      </div>
    </article>
  );
}

function ContributionRow({ submission, bounty }: { submission: FeedbackSubmission; bounty?: BountyMetadata }) {
  const reward = rewardForSubmission(submission, bounty);

  return (
    <article className="surface-soft rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-black text-ink" title={bounty?.title || "Feedback bounty"}>
          {bounty?.title || "Feedback bounty"}
        </h3>
        <BountyStatusBadge status={submission.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-action/25 bg-action/10 px-2.5 py-0.5 text-[11px] font-black text-action">
          {submission.feedbackTypeLabel || getFeedbackTypeLabel(submission.feedbackType)}
        </span>
        <span className="text-xs font-bold text-muted">{statusMessage(submission)}</span>
      </div>
      {reward ? (
        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
          Expected reward <span className="text-ink">{formatUSDC(reward)} testnet USDC</span>
        </p>
      ) : null}
      {submission.payoutTxHash ? (
        <p className="mt-2 text-xs font-bold text-action">
          Payout: <TxHashLink hash={submission.payoutTxHash} />
        </p>
      ) : null}
      {submission.rejectionReason ? (
        <p className="mt-2 rounded-lg border border-red-400/25 bg-red-500/10 p-2.5 text-xs font-semibold text-red-300">
          Note: {submission.rejectionReason}
        </p>
      ) : null}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/bounty/${submission.bountyId}`} className={actionLink}>
          Open bounty
        </Link>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">
          {formatDate(submission.createdAt)}
        </span>
      </div>
    </article>
  );
}

type ActivityKind = "created" | "received" | "contributed";

type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  status?: FeedbackSubmission["status"];
  title: string;
  bountyId: string;
  date: string;
};

function activityLabel(event: ActivityEvent) {
  if (event.kind === "created") return "You created this bounty";
  if (event.kind === "received") {
    if (event.status === "approved") return "You approved a submission";
    if (event.status === "rejected") return "You declined a submission";
    return "New submission received";
  }
  if (event.status === "approved") return "Your feedback was approved";
  if (event.status === "rejected") return "Your feedback was declined";
  return "You submitted feedback";
}

function activityDotClass(event: ActivityEvent) {
  if (event.status === "rejected") return "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]";
  if (event.status === "pending") return "bg-accent shadow-[0_0_10px_rgba(217,150,63,0.45)]";
  // created + approved
  return "bg-action shadow-[0_0_10px_rgba(27,160,108,0.5)]";
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <li>
      <Link
        href={`/bounty/${event.bountyId}`}
        className="focus-ring -mx-2 flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
      >
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", activityDotClass(event))} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{activityLabel(event)}</span>
          <span className="block truncate text-xs text-muted">{event.title}</span>
          <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] text-muted">
            {formatRelativeTime(event.date)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function WalletDashboardPage() {
  const { address, isConnected } = useAccount();
  const walletConnected = Boolean(address) || isConnected;
  const [createdBounties, setCreatedBounties] = useState<BountyMetadata[]>([]);
  const [contributions, setContributions] = useState<FeedbackSubmission[]>([]);
  const [submissionsByBounty, setSubmissionsByBounty] = useState<Record<string, FeedbackSubmission[]>>({});
  const [bountiesById, setBountiesById] = useState<Record<string, BountyMetadata>>({});
  const [origin, setOrigin] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  const receivedSubmissions = useMemo(
    () => Object.values(submissionsByBounty).flat(),
    [submissionsByBounty]
  );

  const stats = useMemo(
    () => ({
      created: createdBounties.length,
      submissions: receivedSubmissions.length,
      approved: receivedSubmissions.filter((submission) => submission.status === "approved").length,
      pending: receivedSubmissions.filter((submission) => submission.status === "pending").length
    }),
    [createdBounties.length, receivedSubmissions]
  );

  // Recent activity is derived only from real created bounties + real
  // submissions (their createdAt timestamps and current status). No events
  // are invented; if there is nothing real to show, the panel stays empty.
  const activity = useMemo<ActivityEvent[]>(() => {
    const createdTitleById = new Map(createdBounties.map((bounty) => [bounty.id, bounty.title]));
    const events: ActivityEvent[] = [];

    for (const bounty of createdBounties) {
      events.push({ id: `created-${bounty.id}`, kind: "created", title: bounty.title, bountyId: bounty.id, date: bounty.createdAt });
    }
    for (const submission of receivedSubmissions) {
      events.push({
        id: `received-${submission.id}`,
        kind: "received",
        status: submission.status,
        title: createdTitleById.get(submission.bountyId) || "Your bounty",
        bountyId: submission.bountyId,
        date: submission.createdAt
      });
    }
    for (const submission of contributions) {
      events.push({
        id: `contributed-${submission.id}`,
        kind: "contributed",
        status: submission.status,
        title: bountiesById[submission.bountyId]?.title || "Feedback bounty",
        bountyId: submission.bountyId,
        date: submission.createdAt
      });
    }

    return events
      .filter((event) => !Number.isNaN(new Date(event.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [createdBounties, receivedSubmissions, contributions, bountiesById]);

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

  const loading = !isLoaded;

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        {!walletConnected ? (
          <section className="mx-auto max-w-2xl">
            <div className="surface glow-card p-8 text-center sm:p-10">
              <div className="icon-chip mx-auto mb-5 size-12 text-sm font-black">CQ</div>
              <h1 className="font-display text-3xl tracking-normal text-ink sm:text-4xl">Connect your wallet</h1>
              <p className="mx-auto mt-3 max-w-md text-base leading-7 text-muted">
                Connect the wallet you used to create bounties or submit feedback to open your operations hub.
              </p>
              <div className="mt-6 flex justify-center">
                <WalletConnect />
              </div>
            </div>
          </section>
        ) : (
          <>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Operations hub</p>
                <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Dashboard</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                  Track your created bounties, submissions, and payout activity.
                </p>
              </div>
              <Link href="/create" className="btn-primary w-full sm:w-auto">
                Create bounty
              </Link>
            </header>

            {error ? (
              <div className="notice mt-6 flex flex-col gap-3 border-red-400/30 bg-red-500/10 text-red-200 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">{error}</span>
                <button type="button" onClick={() => void loadDashboard()} className={actionLink}>
                  Retry
                </button>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile icon={<IconLayers />} value={stats.created} label="Created bounties" />
              <StatTile icon={<IconInbox />} value={stats.submissions} label="Total submissions" />
              <StatTile icon={<IconCheck />} value={stats.approved} label="Approved submissions" />
              <StatTile icon={<IconClock />} value={stats.pending} label="Pending reviews" />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-12">
              <Panel title="Created bounties" count={loading ? undefined : stats.created} className="xl:col-span-5">
                {loading ? (
                  <PanelLoading />
                ) : createdBounties.length ? (
                  createdBounties.map((bounty) => (
                    <CreatedBountyRow
                      key={bounty.id}
                      bounty={bounty}
                      submissions={submissionsByBounty[bounty.id] || []}
                      publicLink={`${origin || ""}/bounty/${bounty.id}`}
                    />
                  ))
                ) : (
                  <PanelEmpty
                    message="You have not created any bounties yet. Launch a focused feedback bounty and it will appear here."
                    action={
                      <Link href="/create" className="btn-primary">
                        Create a bounty
                      </Link>
                    }
                  />
                )}
              </Panel>

              <Panel title="My contributions" count={loading ? undefined : contributions.length} className="xl:col-span-4">
                {loading ? (
                  <PanelLoading />
                ) : contributions.length ? (
                  contributions.map((submission) => (
                    <ContributionRow key={submission.id} submission={submission} bounty={bountiesById[submission.bountyId]} />
                  ))
                ) : (
                  <PanelEmpty
                    message="You have not submitted feedback yet. Preview the example bounty to see how contributions are tracked."
                    action={
                      <Link href="/bounty/demo" className="btn-secondary">
                        Preview bounty
                      </Link>
                    }
                  />
                )}
              </Panel>

              <Panel title="Recent activity" className="xl:col-span-3 lg:col-span-2">
                {loading ? (
                  <PanelLoading />
                ) : activity.length ? (
                  <ul className="-my-1">
                    {activity.map((event) => (
                      <ActivityItem key={event.id} event={event} />
                    ))}
                  </ul>
                ) : (
                  <PanelEmpty message="No activity yet. Created bounties, new submissions, and approvals will show up here." />
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </>
  );
}
