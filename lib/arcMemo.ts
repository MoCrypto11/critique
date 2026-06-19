import { encodeFunctionData, keccak256, stringToHex } from "viem";
import { critiqueDropBountyAbi } from "@/lib/contracts";
import { BountyMetadata, FeedbackSubmission } from "@/lib/storage";

// Builds the Arc memo arguments for an approval.
//
// Design note: approveSubmission on CritiqueDropBountyV2 is founder-gated
// (msg.sender must be the founder), so the memo contract cannot call it without
// reverting. The real payout therefore happens in a direct approveSubmission
// transaction; this memo is a *companion* record. The inner call points at a
// harmless view (getBounty) purely so the memo contract has a valid target to
// execute while it emits the memo with our reconciliation metadata.
export function buildApprovalMemo({
  bounty,
  submission,
  rewardUSDC
}: {
  bounty: BountyMetadata;
  submission: FeedbackSubmission;
  rewardUSDC: string;
}) {
  const memoIdSource = `critique:${bounty.id}:${submission.id}:approve`;
  const memoId = keccak256(stringToHex(memoIdSource));

  const memoPayload = {
    app: "Critique",
    action: "approve_submission",
    bountyId: bounty.id,
    contractBountyId: bounty.contractBountyId,
    submissionId: submission.id,
    feedbackType: submission.feedbackType,
    feedbackTypeLabel: submission.feedbackTypeLabel,
    rewardUSDC,
    payoutWallet: submission.testerWallet,
    submissionHash: submission.submissionHash
  };
  const memoData = stringToHex(JSON.stringify(memoPayload));

  const innerData = encodeFunctionData({
    abi: critiqueDropBountyAbi,
    functionName: "getBounty",
    args: [BigInt(bounty.contractBountyId as string)]
  });

  return { memoId, memoIdSource, memoData, memoPayload, innerData };
}
