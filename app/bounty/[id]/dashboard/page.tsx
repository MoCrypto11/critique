"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { FounderAccess, FounderGate } from "@/components/FounderGate";
import { MockModeBanner } from "@/components/MockModeBanner";
import { OnChainReceipts } from "@/components/OnChainReceipts";
import { StatCard } from "@/components/StatCard";
import { CRITIQUE_DROP_CONTRACT, ENABLE_MOCK_MODE, critiqueDropBountyAbi } from "@/lib/contracts";
import {
  feedbackTypeOptions,
  formatUSDC,
  getRewardForType,
  getTargetRewardTotalUSDC,
  normalizeFeedbackRewards
} from "@/lib/feedbackRewards";
import {
  addTxHashToBounty,
  BountyMetadata,
  FeedbackSubmission,
  getLocalBounty,
  listSubmissions,
  updateLocalBounty
} from "@/lib/storage";
import { isFounderWallet } from "@/lib/utils";

// Compact USDC label for dashboard cards (Arc testnet context lives in the
// global network badge / footer, so cards stay clean: "12 USDC", "0 USDC").
function usdcLabel(value: string | number | undefined) {
  const formatted = formatUSDC(value);
  return formatted === "Not set" ? "0 USDC" : `${formatted} USDC`;
}

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [bounty, setBounty] = useState<BountyMetadata>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [publicLink, setPublicLink] = useState("");
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);

  const approved = submissions.filter((submission) => submission.status === "approved");
  const pending = submissions.filter((submission) => submission.status === "pending");
  const rejected = submissions.filter((submission) => submission.status === "rejected");
  const rewardConfig = bounty
    ? normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
        (reward) => reward.enabled !== false
      )
    : [];
  const totalFunded = bounty ? getTargetRewardTotalUSDC(rewardConfig) : 0;
  const totalPaid = approved.reduce((total, submission) => total + Number(rewardAmountForSubmission(submission)), 0);
  const remaining = Math.max(0, totalFunded - totalPaid);
  const canRefund = bounty ? bounty.status === "closed" || new Date(bounty.deadline).getTime() <= Date.now() : false;

  function rewardAmountForSubmission(submission: FeedbackSubmission) {
    return (
      submission.expectedRewardUSDC ||
      getRewardForType(rewardConfig, submission.feedbackType)?.rewardUSDC ||
      bounty?.rewardUSDC ||
      "0"
    );
  }

  // Founder gate: only the bounty founder may load submission/management data.
  const refresh = useCallback(async () => {
    const nextBounty = await getLocalBounty(params.id);
    const nextSubmissions =
      nextBounty && isFounderWallet(nextBounty.founderAddress, address) ? await listSubmissions(nextBounty.id) : [];
    setBounty(nextBounty);
    setSubmissions(nextSubmissions);
    setPublicLink(`${window.location.origin}/bounty/${params.id}`);
    setIsLoaded(true);
  }, [params.id, address]);

  useEffect(() => {
    void refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load dashboard.");
      setIsLoaded(true);
    });
  }, [refresh]);

  async function closeBounty() {
    setError("");
    setStatus("");
    if (!bounty) return;
    try {
      if (!isConnected || !address) throw new Error("Connect founder wallet first.");
      if (bounty.founderAddress && bounty.founderAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Connected wallet is not the founder for this local bounty.");
      }

      if (CRITIQUE_DROP_CONTRACT && bounty.contractBountyId) {
        if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
        setStatus("Closing bounty on contract...");
        const txHash = await walletClient.writeContract({
          address: getAddress(CRITIQUE_DROP_CONTRACT),
          abi: critiqueDropBountyAbi,
          functionName: "closeBounty",
          args: [BigInt(bounty.contractBountyId)],
          account: address
        });
        await addTxHashToBounty(bounty.id, txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else if (!ENABLE_MOCK_MODE) {
        throw new Error("Contract is not configured.");
      }

      await updateLocalBounty(bounty.id, { status: "closed" });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not close bounty.");
    } finally {
      setStatus("");
    }
  }

  async function refundUnused() {
    setError("");
    setStatus("");
    if (!bounty) return;
    try {
      if (!canRefund) throw new Error("Refund is available only after deadline or after closing bounty.");
      if (!isConnected || !address) throw new Error("Connect founder wallet first.");
      if (bounty.founderAddress && bounty.founderAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Connected wallet is not the founder for this local bounty.");
      }

      if (CRITIQUE_DROP_CONTRACT && bounty.contractBountyId) {
        if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
        setStatus("Refunding unused testnet USDC...");
        const txHash = await walletClient.writeContract({
          address: getAddress(CRITIQUE_DROP_CONTRACT),
          abi: critiqueDropBountyAbi,
          functionName: "refundUnused",
          args: [BigInt(bounty.contractBountyId)],
          account: address
        });
        await addTxHashToBounty(bounty.id, txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else if (!ENABLE_MOCK_MODE) {
        throw new Error("Contract is not configured.");
      }

      setStatus("Unused funds refunded.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refund unused funds.");
    }
  }

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

  if (access !== "authorized" || !bounty) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <FounderGate access={access} bountyId={params.id} />
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Founder dashboard</p>
            <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">{bounty.title}</h1>
            <p className="mt-3 text-base leading-7 text-muted">Bounty stats, transaction hashes, and payout receipts.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/bounty/${bounty.id}`} className="btn-secondary">
              Public link
            </Link>
            {publicLink ? <CopyLinkButton href={publicLink} label="Copy public link" /> : null}
            <Link href={`/bounty/${bounty.id}/review`} className="btn-secondary">
              Review
            </Link>
          </div>
        </div>

        {!CRITIQUE_DROP_CONTRACT && ENABLE_MOCK_MODE ? <MockModeBanner className="mb-5" /> : null}
        {error ? <div className="notice mb-5 border-red-400/30 bg-red-500/10 font-semibold text-red-200">{error}</div> : null}
        {status ? <div className="notice mb-5 border-action/20 bg-action/10 font-semibold text-action">{status}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total configured funding" value={usdcLabel(totalFunded)} tone="strong" />
          <StatCard label="Total approved payouts" value={usdcLabel(totalPaid)} tone="strong" />
          <StatCard label="Remaining configured balance" value={usdcLabel(remaining)} tone="strong" />
          <StatCard label="Reward pools" value={rewardConfig.length} />
          <StatCard label="Slots used" value={`${submissions.length}/${bounty.maxSubmissions}`} />
          <StatCard label="Approved" value={approved.length} />
          <StatCard label="Pending" value={pending.length} />
          <StatCard label="Rejected" value={rejected.length} />
        </div>

        <section className="surface mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Funds</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Deadline: {new Date(bounty.deadline).toLocaleString()}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeBounty}
                disabled={bounty.status === "closed"}
                className="btn-secondary"
              >
                Close bounty
              </button>
              <button
                type="button"
                onClick={refundUnused}
                disabled={!canRefund}
                className="btn-primary"
              >
                Refund Unused Funds
              </button>
            </div>
          </div>
        </section>

        <section className="surface mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Feedback reward configuration</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Create and fund once. Approved submissions are paid according to the selected feedback format.
              </p>
            </div>
            <p className="text-sm font-bold text-action">Approved submissions are paid by selected feedback format.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {rewardConfig.map((config) => {
              const option = feedbackTypeOptions.find((item) => item.value === config.feedbackType);
              const approvedForType = approved.filter((submission) => submission.feedbackType === config.feedbackType).length;
              const remainingForType = Math.max(0, config.slots - approvedForType);
              return (
                <div key={config.feedbackType} className="surface-soft p-4">
                  <p className="text-sm font-black text-ink">{config.label || option?.label || config.feedbackType}</p>
                  <p className="mt-2 text-sm font-semibold text-action">
                    {usdcLabel(config.rewardUSDC)} configured
                  </p>
                  <p className="mt-1 text-sm text-muted">
                {remainingForType}/{config.slots} configured slots remaining
              </p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-6">
          <OnChainReceipts bounty={bounty} submissions={submissions} rewardFor={rewardAmountForSubmission} />
        </div>
      </main>
    </>
  );
}
