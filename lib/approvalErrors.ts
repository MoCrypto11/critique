import { BaseError, ContractFunctionRevertedError } from "viem";

// Human messages for CritiqueDropBountyV2 custom errors raised by approveSubmission.
export const APPROVAL_ERROR_MESSAGES: Record<string, string> = {
  TesterAlreadyPaid:
    "This payout wallet has already received a reward for this bounty. Use a different contributor payout wallet or reject this duplicate submission.",
  MaxSubmissionsReached: "This feedback type has no remaining funded slots for this bounty.",
  InvalidFeedbackType: "This feedback type is not configured or enabled for this bounty.",
  SubmissionHashAlreadyUsed: "This submission has already been approved for this bounty.",
  InsufficientBountyFunds: "This bounty does not have enough remaining funds to pay this reward.",
  BountyClosedError: "This bounty is closed, so its submissions can no longer be approved.",
  InvalidTester: "The payout wallet on this submission is not a valid address.",
  OnlyFounder: "Only the founder wallet that created this bounty can approve its submissions.",
  BountyNotFound: "This bounty could not be found on-chain."
};

// Contract business-rule / state errors: a direct (non-memo) approval would
// revert with the SAME error, so offering "retry without Arc memo" is wrong.
export const BUSINESS_RULE_ERRORS = new Set([
  "TesterAlreadyPaid",
  "MaxSubmissionsReached",
  "InvalidFeedbackType",
  "SubmissionHashAlreadyUsed",
  "InsufficientBountyFunds",
  "BountyClosedError",
  "InvalidTester",
  "BountyNotFound",
  "OnlyFounder"
]);

export type ApprovalErrorInfo = { errorName?: string; message: string; isBusinessRule: boolean };

// Extracts the named custom error (if any) from a viem revert/simulation error
// and returns a precise, founder-facing message plus whether it is a business
// rule (which a direct approve cannot bypass).
export function parseApprovalError(error: unknown): ApprovalErrorInfo {
  let errorName: string | undefined;
  if (error instanceof BaseError) {
    const revert = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      errorName = revert.data?.errorName ?? undefined;
    }
  }

  if (errorName && APPROVAL_ERROR_MESSAGES[errorName]) {
    return { errorName, message: APPROVAL_ERROR_MESSAGES[errorName], isBusinessRule: BUSINESS_RULE_ERRORS.has(errorName) };
  }
  if (errorName) {
    return {
      errorName,
      message: `Approval was rejected by the bounty contract (${errorName}).`,
      isBusinessRule: BUSINESS_RULE_ERRORS.has(errorName)
    };
  }

  const fallback =
    error instanceof BaseError ? error.shortMessage : error instanceof Error ? error.message : "Approval simulation failed.";
  return { message: `Approval cannot proceed on-chain: ${fallback}`, isBusinessRule: false };
}
