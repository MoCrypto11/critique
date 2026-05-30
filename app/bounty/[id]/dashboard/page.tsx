"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmptyState } from "@/components/EmptyState";
import { MockModeBanner } from "@/components/MockModeBanner";
import { ReceiptCard } from "@/components/ReceiptCard";
import { StatCard } from "@/components/StatCard";
import { TxHashLink } from "@/components/TxHashLink";
import { CRITIQUE_DROP_CONTRACT, ENABLE_MOCK_MODE, critiqueDropBountyAbi } from "@/lib/contracts";
import {
  addTxHashToBounty,
  BountyMetadata,
  FeedbackSubmission,
  getLocalBounty,
  listSubmissions,
  updateLocalBounty
} from "@/lib/storage";

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
  const reward = bounty ? Number(bounty.rewardUSDC) : 0;
  const totalFunded = bounty ? reward * bounty.maxSubmissions : 0;
  const totalPaid = reward * approved.length;
  const remaining = Math.max(0, totalFunded - totalPaid);
  const canRefund = bounty ? bounty.status === "closed" || new Date(bounty.deadline).getTime() <= Date.now() : false;

  const refresh = useCallback(async () => {
    const nextBounty = await getLocalBounty(params.id);
    const nextSubmissions = nextBounty ? await listSubmissions(nextBounty.id) : [];
    setBounty(nextBounty);
    setSubmissions(nextSubmissions);
    setPublicLink(`${window.location.origin}/bounty/${params.id}`);
    setIsLoaded(true);
  }, [params.id]);

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
        throw new Error("Contract is not configured and mock mode is disabled.");
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
        setStatus("Refunding unused USDC...");
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
        throw new Error("Contract is not configured and mock mode is disabled.");
      }

      setStatus("Unused funds refunded.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refund unused funds.");
    }
  }

  if (!isLoaded) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState title="Loading dashboard" body="Preparing bounty stats and payout receipts." />
        </main>
      </>
    );
  }

  if (!bounty) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState title="Bounty not found" body="Create a bounty or open the demo bounty." />
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
        {error ? <div className="notice mb-5 border-red-200 bg-red-50 font-semibold text-red-700">{error}</div> : null}
        {status ? <div className="notice mb-5 border-action/20 bg-action/10 font-semibold text-action">{status}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total funded" value={`${totalFunded} USDC`} tone="strong" />
          <StatCard label="Total paid" value={`${totalPaid} USDC`} tone="strong" />
          <StatCard label="Remaining balance" value={`${remaining} USDC`} tone="strong" />
          <StatCard label="Reward" value={`${bounty.rewardUSDC} USDC`} />
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
          <div className="mt-5 space-y-3 rounded-xl border border-line/70 bg-panel/70 p-4 text-sm text-muted">
            {bounty.txHashes.length ? (
              bounty.txHashes.map((hash) => (
                <div key={hash}>
                  Transaction: <TxHashLink hash={hash} />
                </div>
              ))
            ) : (
              <p>No transaction hashes yet.</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Receipts</h2>
              <p className="mt-1 text-sm text-muted">Approved submissions become payout receipts here.</p>
            </div>
            <p className="text-sm font-bold text-action">{approved.length} paid</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {approved.length ? (
              approved.map((submission) => <ReceiptCard key={submission.id} submission={submission} amount={bounty.rewardUSDC} />)
            ) : (
              <EmptyState title="No paid receipts" body="Approved feedback payouts will appear here." />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
