"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { BountyStatusBadge } from "@/components/BountyStatusBadge";
import { TxHashLink } from "@/components/TxHashLink";
import { WalletConnect } from "@/components/WalletConnect";
import {
  formatUSDC,
  getFeedbackTypeLabel,
  getRewardForType,
  getTargetRewardTotalUSDC,
  normalizeFeedbackRewards,
  normalizeRewardAmount
} from "@/lib/feedbackRewards";
import {
  BountyMetadata,
  FeedbackSubmission,
  listBountiesByFounder,
  listBountiesByIds,
  listSubmissions,
  listSubmissionsByTester
} from "@/lib/storage";
import { cn, copyText } from "@/lib/utils";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function bountyRewardTotal(bounty: BountyMetadata) {
  const rewards = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
    (reward) => reward.enabled !== false
  );
  return getTargetRewardTotalUSDC(rewards);
}

function rewardForSubmission(submission: FeedbackSubmission, bounty?: BountyMetadata) {
  if (submission.expectedRewardUSDC) return submission.expectedRewardUSDC;
  if (!bounty) return undefined;
  const rewards = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions);
  return getRewardForType(rewards, submission.feedbackType)?.rewardUSDC || bounty.rewardUSDC;
}

// Shared, compact pill used for the small table action buttons.
const tableBtn =
  "focus-ring inline-flex items-center justify-center rounded-md border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-ink transition-colors hover:border-action/40 hover:text-action";

// Row actions: Review is the primary (mint pill); Copy + Receipts are compact
// icon buttons — no stacked outline buttons.
const reviewPill =
  "focus-ring inline-flex items-center rounded-md border border-action/40 bg-action/15 px-2.5 py-1 text-[11px] font-black text-action transition-colors hover:bg-action/25";
const iconBtn =
  "focus-ring grid size-8 shrink-0 place-items-center rounded-md border border-white/12 bg-white/[0.04] text-muted transition-colors hover:border-action/40 hover:text-action md:size-7";

// Shared grid templates so each table header lines up with its rows.
const createdGrid =
  "md:grid md:grid-cols-[minmax(0,1fr)_3.5rem_5rem_3rem_8.5rem] md:items-center md:gap-3";
const contribGrid = "md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,5.5rem)] md:items-center md:gap-2.5";
const rowShell =
  "rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5 md:rounded-none md:border-0 md:border-t md:border-white/[0.06] md:bg-transparent md:p-2.5 md:first:border-t-0 md:hover:bg-white/[0.03]";

/* ── Small inline icons (mint via currentColor) ──────────────────────────── */
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M4 5h16v11H8l-4 3V5Z" strokeLinejoin="round" />
      <path d="M8 9h8M8 12h5" strokeLinecap="round" />
    </svg>
  );
}
function IconDollar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.5c0-1.1-1.1-2-2.5-2s-2.5.9-2.5 2 1.1 2 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2-2.5-.9-2.5-2" strokeLinecap="round" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path d="M7 3h7l4 4v9a2 2 0 0 1-2 2h-3" strokeLinejoin="round" />
      <path d="M14 3v4h4" strokeLinejoin="round" />
      <circle cx="8" cy="15" r="3.2" />
      <path d="m5.7 17.3-2 2" strokeLinecap="round" />
    </svg>
  );
}
function CheckBadge() {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-action/40 bg-action/15 text-action">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" className="size-3">
        <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck2() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-4">
      <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Compact copy-link icon button with a brief copied confirmation.
function RowCopyButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await copyText(href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={cn(iconBtn, copied && "border-action/40 text-action")}
      title="Copy public link"
      aria-label="Copy public link"
    >
      {copied ? <IconCheck2 /> : <IconCopy />}
    </button>
  );
}

function TabCount({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none",
        active ? "bg-white/20 text-white" : "bg-white/10 text-muted"
      )}
    >
      {children}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  unit,
  highlight
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("surface p-5", highlight && "glow-card")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="icon-chip size-8 shrink-0">{icon}</span>
          <p className="truncate text-[13px] font-bold text-muted">{label}</p>
        </div>
        {highlight ? <CheckBadge /> : null}
      </div>
      <p className="mt-4 text-3xl font-black leading-none text-ink">
        {value}
        {unit ? <span className="ml-1.5 text-sm font-black text-muted">{unit}</span> : null}
      </p>
    </div>
  );
}

function Panel({
  title,
  count,
  className,
  children
}: {
  title: string;
  count?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("surface self-start p-5 sm:p-6", className)}>
      <div className="flex items-center gap-2.5 pb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">{title}</h2>
        {typeof count === "number" ? (
          <span className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[11px] font-black text-muted">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PanelEmpty({
  icon,
  title,
  message,
  action
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-soft flex flex-col items-center rounded-xl border-dashed px-5 py-7 text-center">
      {icon ? <span className="icon-chip mb-3 size-10">{icon}</span> : null}
      <p className="text-sm font-black text-ink">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-5 text-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="surface-soft rounded-xl p-4">
          <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-3 w-1/3 animate-pulse rounded-full bg-white/[0.07]" />
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
  const rewardValue = formatUSDC(bountyRewardTotal(bounty));
  const hasReceipts = (bounty.txHashes?.length ?? 0) > 0 || submissions.some((submission) => Boolean(submission.payoutTxHash));

  return (
    <div className={cn(rowShell, createdGrid)}>
      <div className="min-w-0">
        <Link
          href={`/bounty/${bounty.id}`}
          className="focus-ring line-clamp-2 text-sm font-black leading-snug text-ink underline-offset-2 transition-colors hover:text-action hover:underline"
          title={`Open public page: ${bounty.title}`}
        >
          {bounty.title}
        </Link>
      </div>
      <div className="mt-2 md:mt-0 md:text-center">
        <span className="text-[11px] font-bold text-muted md:hidden">Reward · </span>
        <span className="text-xs font-black text-action">{rewardValue}</span>
        <span className="ml-1 text-[9px] font-black uppercase tracking-wide text-muted md:ml-0 md:block">USDC</span>
      </div>
      <div className="mt-2 md:mt-0 md:flex md:justify-center">
        <BountyStatusBadge status={bounty.status} />
      </div>
      <div className="mt-2 md:mt-0 md:text-center">
        <span className="text-[11px] font-bold text-muted md:hidden">Submissions · </span>
        <span className="text-xs font-black text-ink">{submissions.length}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 md:mt-0 md:justify-end">
        <Link href={`/bounty/${bounty.id}/review`} className={reviewPill} title="Review off-chain feedback">
          Review
        </Link>
        <RowCopyButton href={publicLink} />
        {hasReceipts ? (
          <Link
            href={`/bounty/${bounty.id}/dashboard#on-chain-receipts`}
            className={iconBtn}
            title="On-chain receipts"
            aria-label="On-chain receipts"
          >
            <IconReceipt />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ContributionRow({ submission, bounty }: { submission: FeedbackSubmission; bounty?: BountyMetadata }) {
  return (
    <div className={cn(rowShell, contribGrid)}>
      <div className="min-w-0">
        <Link
          href={`/bounty/${submission.bountyId}`}
          className="focus-ring line-clamp-2 text-sm font-black leading-snug text-ink transition-colors hover:text-action"
          title={bounty?.title || "Feedback bounty"}
        >
          {bounty?.title || "Feedback bounty"}
        </Link>
        <span className="mt-0.5 block truncate text-[11px] font-bold text-muted">
          {submission.feedbackTypeLabel || getFeedbackTypeLabel(submission.feedbackType)}
        </span>
      </div>
      <div className="mt-2 md:mt-0 md:flex md:justify-center">
        <BountyStatusBadge status={submission.status} />
      </div>
      <div className="mt-2 text-xs md:mt-0 md:text-right">
        <span className="text-[11px] font-bold text-muted md:hidden">Payout · </span>
        {submission.payoutTxHash ? (
          <TxHashLink hash={submission.payoutTxHash} />
        ) : (
          <span className="font-bold text-muted">—</span>
        )}
      </div>
    </div>
  );
}

type ActivityKind = "created" | "received" | "contributed";

type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  status?: FeedbackSubmission["status"];
  title: string;
  bountyId: string;
  submissionId?: string;
  date: string;
};

// Route founder-side activity (created bounty, submissions received on my
// bounties) to the founder review page — never the public contributor form.
// Focus the specific submission when we know it. The user's own contributions
// go to the public bounty page, where they are the contributor.
function activityHref(event: ActivityEvent) {
  if (event.kind === "contributed") return `/bounty/${event.bountyId}`;
  return event.submissionId
    ? `/bounty/${event.bountyId}/review#submission-${event.submissionId}`
    : `/bounty/${event.bountyId}/review`;
}

function activityLabel(event: ActivityEvent) {
  if (event.kind === "created") return "You created a bounty";
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
  return "bg-action shadow-[0_0_10px_rgba(27,160,108,0.5)]";
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <li>
      <Link
        href={activityHref(event)}
        className="focus-ring -mx-2 flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
      >
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", activityDotClass(event))} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold leading-snug text-ink">{activityLabel(event)}</span>
          <span className="block truncate text-xs text-muted">“{event.title}”</span>
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
  const [view, setView] = useState<"created" | "contributions">("created");
  const [createdBounties, setCreatedBounties] = useState<BountyMetadata[]>([]);
  const [contributions, setContributions] = useState<FeedbackSubmission[]>([]);
  const [submissionsByBounty, setSubmissionsByBounty] = useState<Record<string, FeedbackSubmission[]>>({});
  const [bountiesById, setBountiesById] = useState<Record<string, BountyMetadata>>({});
  const [origin, setOrigin] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  const createdById = useMemo(() => new Map(createdBounties.map((bounty) => [bounty.id, bounty])), [createdBounties]);
  const receivedSubmissions = useMemo(() => Object.values(submissionsByBounty).flat(), [submissionsByBounty]);

  // Display-only ordering (most recent first). The underlying loaded data and
  // its filtering are untouched — these are copies used purely for rendering.
  const createdSorted = useMemo(
    () => [...createdBounties].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [createdBounties]
  );
  const contributionsSorted = useMemo(
    () => [...contributions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [contributions]
  );

  // All four stats come only from real loaded data — open bounties, real
  // received submissions, and the configured rewards of the submissions the
  // founder actually approved. Nothing is hard-coded or invented.
  const stats = useMemo(() => {
    const approved = receivedSubmissions.filter((submission) => submission.status === "approved");
    const approvedTotal = approved.reduce(
      (sum, submission) => sum + normalizeRewardAmount(rewardForSubmission(submission, createdById.get(submission.bountyId))),
      0
    );
    return {
      activeBounties: createdBounties.filter((bounty) => bounty.status === "open").length,
      totalSubmissions: receivedSubmissions.length,
      approvedPayouts: approvedTotal > 0 ? formatUSDC(approvedTotal) : "0",
      pending: receivedSubmissions.filter((submission) => submission.status === "pending").length
    };
  }, [createdBounties, receivedSubmissions, createdById]);

  // Recent activity derived only from real bounties + submissions (their
  // createdAt + current status). No events are fabricated.
  const activity = useMemo<ActivityEvent[]>(() => {
    const events: ActivityEvent[] = [];
    for (const bounty of createdBounties) {
      events.push({ id: `created-${bounty.id}`, kind: "created", title: bounty.title, bountyId: bounty.id, date: bounty.createdAt });
    }
    for (const submission of receivedSubmissions) {
      events.push({
        id: `received-${submission.id}`,
        kind: "received",
        status: submission.status,
        title: createdById.get(submission.bountyId)?.title || "Your bounty",
        bountyId: submission.bountyId,
        submissionId: submission.id,
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
        submissionId: submission.id,
        date: submission.createdAt
      });
    }
    return events
      .filter((event) => !Number.isNaN(new Date(event.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 14);
  }, [createdBounties, receivedSubmissions, contributions, bountiesById, createdById]);

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
      {/* Soft aqua/teal glow pools behind the dashboard canvas. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-[12%] size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(92,234,214,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 right-[6%] size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(70,200,216,0.08),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(88,226,208,0.06),transparent_70%)] blur-3xl" />
      </div>

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
            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-display text-4xl tracking-normal text-ink sm:text-5xl">Dashboard</h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
                  Track your created bounties, submissions, and payout activity.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setView("created")}
                    className={cn(
                      "focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-black transition-colors sm:flex-none",
                      view === "created" ? "bg-action text-white" : "text-muted hover:text-ink"
                    )}
                  >
                    Created bounties
                    {!loading ? <TabCount active={view === "created"}>{createdBounties.length}</TabCount> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("contributions")}
                    className={cn(
                      "focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-black transition-colors sm:flex-none",
                      view === "contributions" ? "bg-action text-white" : "text-muted hover:text-ink"
                    )}
                  >
                    My contributions
                    {!loading ? <TabCount active={view === "contributions"}>{contributions.length}</TabCount> : null}
                  </button>
                </div>
                <Link href="/create" className="btn-primary w-full sm:w-auto">
                  Create bounty
                </Link>
              </div>
            </header>

            {error ? (
              <div className="notice mt-6 flex flex-col gap-3 border-red-400/30 bg-red-500/10 text-red-200 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">{error}</span>
                <button type="button" onClick={() => void loadDashboard()} className={tableBtn}>
                  Retry
                </button>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile icon={<IconChart />} label="Active bounties" value={stats.activeBounties} />
              <StatTile icon={<IconChat />} label="Total submissions" value={stats.totalSubmissions} />
              <StatTile icon={<IconDollar />} label="Approved payouts" value={stats.approvedPayouts} unit="USDC" highlight />
              <StatTile icon={<IconDoc />} label="Pending reviews" value={stats.pending} />
            </div>

            <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              {view === "created" ? (
                <Panel title="Created bounties" count={loading ? undefined : createdBounties.length}>
                  {loading ? (
                    <PanelLoading />
                  ) : createdSorted.length ? (
                    <div>
                      <div
                        className={cn(
                          "hidden px-2.5 pb-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-muted",
                          createdGrid
                        )}
                      >
                        <span>Bounty title</span>
                        <span className="text-center">Reward</span>
                        <span className="text-center">Status</span>
                        <span className="text-center">Subs</span>
                        <span className="text-right">Actions</span>
                      </div>
                      <div className="thin-scroll max-h-[30rem] space-y-2.5 overflow-y-auto pr-1 md:space-y-0">
                        {createdSorted.map((bounty) => (
                          <CreatedBountyRow
                            key={bounty.id}
                            bounty={bounty}
                            submissions={submissionsByBounty[bounty.id] || []}
                            publicLink={`${origin || ""}/bounty/${bounty.id}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <PanelEmpty
                      icon={<IconChart />}
                      title="No bounties yet"
                      message="Launch a focused feedback bounty and it will appear here."
                      action={
                        <Link href="/create" className="btn-primary">
                          Create a bounty
                        </Link>
                      }
                    />
                  )}
                </Panel>
              ) : (
                <Panel title="My contributions" count={loading ? undefined : contributions.length}>
                  {loading ? (
                    <PanelLoading />
                  ) : contributionsSorted.length ? (
                    <div>
                      <div
                        className={cn(
                          "hidden px-2.5 pb-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-muted",
                          contribGrid
                        )}
                      >
                        <span>Submitted feedback</span>
                        <span className="text-center">Status</span>
                        <span className="text-right">Payout TX</span>
                      </div>
                      <div className="thin-scroll max-h-[30rem] space-y-2.5 overflow-y-auto pr-1 md:space-y-0">
                        {contributionsSorted.map((submission) => (
                          <ContributionRow
                            key={submission.id}
                            submission={submission}
                            bounty={bountiesById[submission.bountyId]}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <PanelEmpty
                      icon={<IconChat />}
                      title="No contributions yet"
                      message="Submitted feedback will appear here once this wallet contributes to a bounty."
                      action={
                        <Link href="/bounty/demo" className="btn-secondary">
                          Preview bounty
                        </Link>
                      }
                    />
                  )}
                </Panel>
              )}

              <Panel title="Activity feed" count={loading ? undefined : activity.length}>
                {loading ? (
                  <PanelLoading />
                ) : activity.length ? (
                  <ul className="thin-scroll -mr-1 max-h-[30rem] overflow-y-auto pr-1">
                    {activity.map((event) => (
                      <ActivityItem key={event.id} event={event} />
                    ))}
                  </ul>
                ) : (
                  <PanelEmpty
                    icon={<IconDoc />}
                    title="No activity yet"
                    message="Created bounties, new submissions, and approvals will show up here."
                  />
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </>
  );
}
