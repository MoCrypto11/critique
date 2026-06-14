"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { MockModeBanner } from "@/components/MockModeBanner";
import { RejectSubmissionModal } from "@/components/RejectSubmissionModal";
import { SubmissionCard } from "@/components/SubmissionCard";
import { CRITIQUE_DROP_CONTRACT, ENABLE_MOCK_MODE, critiqueDropBountyAbi } from "@/lib/contracts";
import { formatUSDC, getFeedbackTypeContractId, getRewardForType, normalizeFeedbackRewards } from "@/lib/feedbackRewards";
import {
  approveLocalSubmission,
  BountyMetadata,
  FeedbackSubmission,
  getLocalBounty,
  listSubmissions,
  rejectLocalSubmission,
  addTxHashToBounty
} from "@/lib/storage";

export default function SubmissionReviewPage({ params }: { params: { id: string; submissionId: string } }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [bounty, setBounty] = useState<BountyMetadata>();
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const refresh = useCallback(async () => {
    const [nextBounty, nextSubmissions] = await Promise.all([getLocalBounty(params.id), listSubmissions(params.id)]);
    setBounty(nextBounty);
    setSubmissions(nextSubmissions);
    setIsLoaded(true);
  }, [params.id]);

  useEffect(() => {
    void refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load submission.");
      setIsLoaded(true);
    });
  }, [refresh]);

  const submission = useMemo(
    () => submissions.find((item) => item.id === params.submissionId),
    [submissions, params.submissionId]
  );

  const rewardConfig = bounty
    ? normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
        (reward) => reward.enabled !== false
      )
    : [];

  function rewardLabelFor(target: FeedbackSubmission) {
    const configured = getRewardForType(rewardConfig, target.feedbackType);
    if (target.expectedRewardUSDC) return `Expected reward: ${formatUSDC(target.expectedRewardUSDC)} USDC`;
    if (!configured) return bounty ? `Configured reward: ${formatUSDC(bounty.rewardUSDC)} USDC` : undefined;
    return `Configured reward: ${formatUSDC(configured.rewardUSDC)} USDC`;
  }

  // Approve + pay — identical contract/payout flow to the previous review page,
  // operating on this one submission. (Backend/contract/payout logic unchanged.)
  async function approve(target: FeedbackSubmission) {
    setError("");
    setBusy(true);

    try {
      if (!isConnected || !address) throw new Error("Connect wallet before approving feedback.");
      if (bounty?.founderAddress && bounty.founderAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Connected wallet is not the founder for this local bounty.");
      }

      let payoutTxHash = `mock-${target.submissionHash.slice(2, 12)}`;
      if (CRITIQUE_DROP_CONTRACT) {
        if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
        if (!bounty) throw new Error("Bounty is not loaded.");
        const config = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
          (reward) => reward.enabled !== false
        );
        const selectedReward = getRewardForType(config, target.feedbackType);
        if (!target.feedbackType) {
          throw new Error("This submission is missing a feedback type.");
        }
        if (!bounty.contractBountyId) {
          throw new Error("This bounty is missing a contract bounty ID.");
        }
        const approvedForType = submissions.filter(
          (item) => item.status === "approved" && item.feedbackType === target.feedbackType
        ).length;
        if (selectedReward && approvedForType >= selectedReward.slots) {
          throw new Error("This feedback type has no remaining funded slots.");
        }

        const txHash = await walletClient.writeContract({
          address: getAddress(CRITIQUE_DROP_CONTRACT),
          abi: critiqueDropBountyAbi,
          functionName: "approveSubmission",
          args: [
            BigInt(bounty.contractBountyId),
            getFeedbackTypeContractId(target.feedbackType),
            getAddress(target.testerWallet),
            target.submissionHash as `0x${string}`
          ],
          account: address
        });
        payoutTxHash = txHash;
        await addTxHashToBounty(bounty.id, txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else if (!ENABLE_MOCK_MODE) {
        throw new Error("Contract is not configured.");
      }

      await approveLocalSubmission(params.id, target.id, payoutTxHash);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve submission.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReject(reason: string) {
    if (!submission) return;
    setRejectError("");
    setIsRejecting(true);
    try {
      await rejectLocalSubmission(params.id, submission.id, reason);
      setRejectOpen(false);
      await refresh();
    } catch (caught) {
      setRejectError(caught instanceof Error ? caught.message : "Could not reject submission. Please try again.");
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <Link
          href={`/bounty/${params.id}/review`}
          className="focus-ring inline-flex items-center gap-1.5 text-sm font-black text-muted transition-colors hover:text-action"
        >
          <span aria-hidden="true">←</span> Back to submissions
        </Link>

        {!isLoaded ? (
          <div className="mt-6">
            <EmptyState title="Loading submission" body="Preparing the submission details." />
          </div>
        ) : !bounty ? (
          <div className="mt-6">
            <EmptyState title="Bounty not found" body="Create a bounty or try the example bounty." />
          </div>
        ) : !submission ? (
          <div className="mt-6">
            <EmptyState title="Submission not found" body="This submission is not part of this bounty." />
          </div>
        ) : (
          <>
            <div className="mb-6 mt-4">
              <p className="eyebrow">Founder review</p>
              <h1 className="font-display mt-3 text-2xl tracking-normal text-ink sm:text-3xl">{bounty.title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Reviewing one submission — approve and pay, or reject with a reason.
              </p>
            </div>

            {!CRITIQUE_DROP_CONTRACT && ENABLE_MOCK_MODE ? <MockModeBanner className="mb-5" /> : null}
            {error ? <div className="notice mb-5 border-red-400/30 bg-red-500/10 font-semibold text-red-200">{error}</div> : null}

            <SubmissionCard
              submission={submission}
              rewardLabel={rewardLabelFor(submission)}
              busy={busy}
              onApprove={() => approve(submission)}
              onReject={() => {
                setRejectError("");
                setRejectOpen(true);
              }}
            />
          </>
        )}
      </main>
      <RejectSubmissionModal
        open={rejectOpen}
        busy={isRejecting}
        error={rejectError}
        onCancel={() => {
          if (isRejecting) return;
          setRejectOpen(false);
          setRejectError("");
        }}
        onConfirm={confirmReject}
      />
    </>
  );
}
