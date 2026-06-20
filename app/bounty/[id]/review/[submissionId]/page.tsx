"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { decodeEventLog, getAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { FounderAccess, FounderGate } from "@/components/FounderGate";
import { MockModeBanner } from "@/components/MockModeBanner";
import { RejectSubmissionModal } from "@/components/RejectSubmissionModal";
import { SubmissionCard } from "@/components/SubmissionCard";
import {
  ARC_MEMO_CONTRACT,
  arcMemoAbi,
  CRITIQUE_DROP_CONTRACT,
  ENABLE_ARC_MEMOS,
  ENABLE_MOCK_MODE,
  critiqueDropBountyAbi
} from "@/lib/contracts";
import { buildApprovalMemo } from "@/lib/arcMemo";
import { formatUSDC, getFeedbackTypeContractId, getRewardForType, normalizeFeedbackRewards } from "@/lib/feedbackRewards";
import {
  approveLocalSubmission,
  attachSubmissionMemo,
  BountyMetadata,
  FeedbackSubmission,
  getLocalBounty,
  listSubmissions,
  rejectLocalSubmission,
  addTxHashToBounty
} from "@/lib/storage";
import { isFounderWallet } from "@/lib/utils";

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
  const [memoFailed, setMemoFailed] = useState(false);

  // Founder gate: only the founder of this bounty may load submission data.
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

  // Plain reward amount (e.g. "0.1 USDC") for the approved payout receipt.
  function paidRewardFor(target: FeedbackSubmission) {
    const configured = getRewardForType(rewardConfig, target.feedbackType);
    const amount = target.expectedRewardUSDC || configured?.rewardUSDC || bounty?.rewardUSDC;
    return amount ? `${formatUSDC(amount)} USDC` : undefined;
  }

  // Approve + pay one submission. When Arc memos are enabled, the approval is a
  // TRUE memo-wrapped transaction: Memo.memo(target = bounty contract, data =
  // approveSubmission(...), memoId, memoData) — one tx where Arc's CallFrom
  // precompile preserves the founder as msg.sender, so approveSubmission runs,
  // the contributor is paid, and the Memo event is emitted together. The
  // memo-wrapped tx hash is saved as the approval/payout hash. If the memo tx
  // reverts (or the payout event is missing) the submission stays pending and
  // the founder can retry with memos disabled (forceDirect).
  async function approve(target: FeedbackSubmission, options?: { forceDirect?: boolean }) {
    setError("");
    setBusy(true);
    setMemoFailed(false);

    const useMemo = ENABLE_ARC_MEMOS && !options?.forceDirect;

    try {
      if (!isConnected || !address) throw new Error("Connect wallet before approving feedback.");
      if (bounty?.founderAddress && bounty.founderAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Connected wallet is not the founder for this bounty.");
      }

      // Mock mode (no contract configured): approve locally only.
      if (!CRITIQUE_DROP_CONTRACT) {
        if (!ENABLE_MOCK_MODE) throw new Error("Contract is not configured.");
        await approveLocalSubmission(params.id, target.id, `mock-${target.submissionHash.slice(2, 12)}`);
        await refresh();
        return;
      }

      if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
      if (!bounty) throw new Error("Bounty is not loaded.");
      if (!target.feedbackType) throw new Error("This submission is missing a feedback type.");
      if (!bounty.contractBountyId) throw new Error("This bounty is missing a contract bounty ID.");

      const config = normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions).filter(
        (reward) => reward.enabled !== false
      );
      const selectedReward = getRewardForType(config, target.feedbackType);
      const approvedForType = submissions.filter(
        (item) => item.status === "approved" && item.feedbackType === target.feedbackType
      ).length;
      if (selectedReward && approvedForType >= selectedReward.slots) {
        throw new Error("This feedback type has no remaining funded slots.");
      }

      const rewardUSDC = target.expectedRewardUSDC || selectedReward?.rewardUSDC || bounty.rewardUSDC || "0";

      if (useMemo && ARC_MEMO_CONTRACT) {
        const { memoId, memoData, innerData } = buildApprovalMemo({ bounty, submission: target, rewardUSDC });

        let memoTxHash: `0x${string}`;
        try {
          memoTxHash = await walletClient.writeContract({
            address: getAddress(ARC_MEMO_CONTRACT),
            abi: arcMemoAbi,
            functionName: "memo",
            args: [getAddress(CRITIQUE_DROP_CONTRACT), innerData, memoId, memoData],
            account: address
          });
        } catch (sendError) {
          setMemoFailed(true);
          throw new Error(
            `Arc memo transaction was not sent: ${
              sendError instanceof Error ? sendError.message : "the wallet rejected or failed the request"
            }`
          );
        }

        await addTxHashToBounty(bounty.id, memoTxHash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: memoTxHash });

        // Approve locally ONLY with proof the inner approveSubmission executed:
        // tx success + a SubmissionApproved event from the bounty contract.
        const approvedEmitted =
          receipt.status === "success" &&
          receipt.logs.some((log) => {
            if (log.address.toLowerCase() !== CRITIQUE_DROP_CONTRACT.toLowerCase()) return false;
            try {
              return (
                decodeEventLog({ abi: critiqueDropBountyAbi, data: log.data, topics: log.topics }).eventName ===
                "SubmissionApproved"
              );
            } catch {
              return false;
            }
          });

        if (!approvedEmitted) {
          setMemoFailed(true);
          throw new Error(
            "Arc memo transaction did not complete the approval (no payout event in the receipt). The submission was not approved. You can retry without Arc memos."
          );
        }

        const memoEmitted = receipt.logs.some(
          (log) => log.address.toLowerCase() === ARC_MEMO_CONTRACT.toLowerCase()
        );
        await approveLocalSubmission(params.id, target.id, memoTxHash);
        await attachSubmissionMemo(params.id, target.id, {
          memoId,
          memoTxHash,
          memoStatus: memoEmitted ? "attached" : "sent"
        }).catch(() => undefined);
        await refresh();
        return;
      }

      // Direct approval (memos disabled or retry-without-memo).
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
      await addTxHashToBounty(bounty.id, txHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Approval transaction reverted on-chain. The submission was not approved.");
      }
      await approveLocalSubmission(params.id, target.id, txHash);
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
        <Link
          href={`/bounty/${params.id}/review`}
          className="focus-ring inline-flex items-center gap-1.5 text-sm font-black text-muted transition-colors hover:text-action"
        >
          <span aria-hidden="true">←</span> Back to submissions
        </Link>

        {!submission ? (
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
            {error ? (
              <div className="notice mb-5 flex flex-col gap-3 border-red-400/30 bg-red-500/10 font-semibold text-red-200 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                {memoFailed && submission ? (
                  <button
                    type="button"
                    onClick={() => approve(submission, { forceDirect: true })}
                    disabled={busy}
                    className="btn-secondary shrink-0"
                  >
                    Retry without Arc memo
                  </button>
                ) : null}
              </div>
            ) : null}

            <SubmissionCard
              submission={submission}
              rewardLabel={rewardLabelFor(submission)}
              bountyTitle={bounty.title}
              paidReward={paidRewardFor(submission)}
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
