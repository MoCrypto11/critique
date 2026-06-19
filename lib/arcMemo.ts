import { encodeFunctionData, getAddress, keccak256, stringToHex } from "viem";
import { critiqueDropBountyAbi } from "@/lib/contracts";
import { getFeedbackTypeContractId } from "@/lib/feedbackRewards";
import { BountyMetadata, FeedbackSubmission } from "@/lib/storage";

// Builds the arguments for a TRUE memo-wrapped approval:
//   Memo.memo(target = bounty contract, data = approveSubmission(...), memoId, memoData)
//
// On Arc the Memo contract forwards the inner call via the CallFrom precompile,
// so the bounty contract sees the original founder EOA as msg.sender and the
// onlyFounder check passes. The approval, USDC payout, and Memo event all land
// in the same transaction.
export function buildApprovalMemo({
  bounty,
  submission,
  rewardUSDC
}: {
  bounty: BountyMetadata;
  submission: FeedbackSubmission;
  rewardUSDC: string;
}) {
  if (!bounty.contractBountyId) throw new Error("Bounty is missing a contract bounty id.");
  if (!submission.feedbackType) throw new Error("Submission is missing a feedback type.");

  const memoIdSource = `critique:${bounty.id}:${submission.id}:approve`;
  const memoId = keccak256(stringToHex(memoIdSource));

  const memoPayload = {
    app: "Critique",
    action: "approve_submission",
    bountyId: bounty.id,
    contractBountyId: bounty.contractBountyId,
    submissionId: submission.id,
    feedbackType: submission.feedbackType,
    rewardUSDC,
    payoutWallet: submission.testerWallet,
    submissionHash: submission.submissionHash
  };
  const memoData = stringToHex(JSON.stringify(memoPayload));

  const innerData = encodeFunctionData({
    abi: critiqueDropBountyAbi,
    functionName: "approveSubmission",
    args: [
      BigInt(bounty.contractBountyId),
      getFeedbackTypeContractId(submission.feedbackType),
      getAddress(submission.testerWallet),
      submission.submissionHash as `0x${string}`
    ]
  });

  return { memoId, memoIdSource, memoData, memoPayload, innerData };
}
