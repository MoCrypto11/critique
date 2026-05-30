"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { MockModeBanner } from "@/components/MockModeBanner";
import { SubmissionCard } from "@/components/SubmissionCard";
import { CRITIQUE_DROP_CONTRACT, ENABLE_MOCK_MODE, critiqueDropBountyAbi } from "@/lib/contracts";
import {
  approveLocalSubmission,
  BountyMetadata,
  FeedbackSubmission,
  getLocalBounty,
  listSubmissions,
  rejectLocalSubmission,
  addTxHashToBounty
} from "@/lib/storage";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [bounty, setBounty] = useState<BountyMetadata>();
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [nextBounty, nextSubmissions] = await Promise.all([getLocalBounty(params.id), listSubmissions(params.id)]);
    setBounty(nextBounty);
    setSubmissions(nextSubmissions);
    setIsLoaded(true);
  }, [params.id]);

  useEffect(() => {
    void refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load submissions.");
      setIsLoaded(true);
    });
  }, [refresh]);

  async function approve(submission: FeedbackSubmission) {
    setError("");
    setBusyId(submission.id);

    try {
      if (!isConnected || !address) throw new Error("Connect wallet before approving feedback.");
      if (bounty?.founderAddress && bounty.founderAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Connected wallet is not the founder for this local bounty.");
      }

      let payoutTxHash = `mock-${submission.submissionHash.slice(2, 12)}`;
      if (CRITIQUE_DROP_CONTRACT) {
        if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
        if (!bounty?.contractBountyId) throw new Error("This local bounty is missing a contract bounty ID.");

        const txHash = await walletClient.writeContract({
          address: getAddress(CRITIQUE_DROP_CONTRACT),
          abi: critiqueDropBountyAbi,
          functionName: "approveSubmission",
          args: [BigInt(bounty.contractBountyId), getAddress(submission.testerWallet), submission.submissionHash as `0x${string}`],
          account: address
        });
        payoutTxHash = txHash;
        await addTxHashToBounty(bounty.id, txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else if (!ENABLE_MOCK_MODE) {
        throw new Error("Contract is not configured and mock mode is disabled.");
      }

      await approveLocalSubmission(params.id, submission.id, payoutTxHash);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve submission.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(submission: FeedbackSubmission) {
    const reason = window.prompt("Rejection reason");
    if (!reason) return;
    try {
      await rejectLocalSubmission(params.id, submission.id, reason);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reject submission.");
    }
  }

  const pendingCount = submissions.filter((submission) => submission.status === "pending").length;
  const approvedCount = submissions.filter((submission) => submission.status === "approved").length;
  const rejectedCount = submissions.filter((submission) => submission.status === "rejected").length;

  if (isLoaded && !bounty) {
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
            <p className="eyebrow">Founder review</p>
            <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Review submissions</h1>
            <p className="mt-3 text-base leading-7 text-muted">{bounty?.title || "Local bounty"}</p>
          </div>
          <Link href={`/bounty/${params.id}/dashboard`} className="btn-secondary w-full sm:w-auto">
            View Dashboard
          </Link>
        </div>
        {!CRITIQUE_DROP_CONTRACT && ENABLE_MOCK_MODE ? (
          <MockModeBanner className="mb-5" />
        ) : null}
        {error ? <div className="notice mb-5 border-red-200 bg-red-50 font-semibold text-red-700">{error}</div> : null}
        {isLoaded ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="surface-soft p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Pending</p>
              <p className="mt-2 text-2xl font-black text-ink">{pendingCount}</p>
            </div>
            <div className="surface-soft p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Approved</p>
              <p className="mt-2 text-2xl font-black text-action">{approvedCount}</p>
            </div>
            <div className="surface-soft p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Rejected</p>
              <p className="mt-2 text-2xl font-black text-ink">{rejectedCount}</p>
            </div>
          </div>
        ) : null}
        <div className="space-y-5">
          {!isLoaded ? (
            <EmptyState title="Loading submissions" body="Preparing the founder review queue." />
          ) : submissions.length ? (
            submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                busy={busyId === submission.id}
                onApprove={() => approve(submission)}
                onReject={() => reject(submission)}
              />
            ))
          ) : (
            <EmptyState title="No feedback yet" body="Share the public bounty link with testers." />
          )}
        </div>
      </main>
    </>
  );
}
