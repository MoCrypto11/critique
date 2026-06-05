import { keccak256, stringToBytes } from "viem";

export function createSubmissionHash(input: {
  bountyId: string;
  testerWallet: string;
  feedbackType?: string;
  feedbackTypeLabel?: string;
  expectedRewardUSDC?: string;
  testerContext?: string;
  firstImpression?: string;
  firstAction?: string;
  confusionAnswer?: string;
  valueClarity?: string;
  hesitation?: string;
  decision?: string;
  decisionReason?: string;
  bestImprovement?: string;
  confusedAnswer?: string;
  understoodAnswer?: string;
  signupAnswer?: string;
  proofLink?: string;
  videoLink?: string;
  videoSummary?: string;
  biggestIssue?: string;
  videoImprovement?: string;
  contributorBackground?: string;
  technicalProblem?: string;
  technicalWhy?: string;
  suggestedFix?: string;
  expectedImpact?: string;
  estimatedDifficulty?: string;
  referenceLink?: string;
  submissionId: string;
}) {
  const normalized = [
    input.bountyId,
    input.testerWallet.toLowerCase(),
    (input.feedbackType || "").trim(),
    (input.feedbackTypeLabel || "").trim(),
    (input.expectedRewardUSDC || "").trim(),
    (input.testerContext || "").trim(),
    (input.firstImpression || "").trim(),
    (input.firstAction || "").trim(),
    (input.confusionAnswer || "").trim(),
    (input.valueClarity || "").trim(),
    (input.hesitation || "").trim(),
    (input.decision || "").trim(),
    (input.decisionReason || "").trim(),
    (input.bestImprovement || "").trim(),
    (input.confusedAnswer || "").trim(),
    (input.understoodAnswer || "").trim(),
    (input.signupAnswer || "").trim(),
    (input.proofLink || "").trim(),
    (input.videoLink || "").trim(),
    (input.videoSummary || "").trim(),
    (input.biggestIssue || "").trim(),
    (input.videoImprovement || "").trim(),
    (input.contributorBackground || "").trim(),
    (input.technicalProblem || "").trim(),
    (input.technicalWhy || "").trim(),
    (input.suggestedFix || "").trim(),
    (input.expectedImpact || "").trim(),
    (input.estimatedDifficulty || "").trim(),
    (input.referenceLink || "").trim(),
    input.submissionId
  ].join("|");

  return keccak256(stringToBytes(normalized));
}
