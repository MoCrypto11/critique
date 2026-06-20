export const CRITIQUE_DROP_CONTRACT = process.env.NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT || "";
export const ENABLE_MOCK_MODE = process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE !== "false";

// Arc transaction memos (feature-flagged, off by default). When enabled, a
// successful direct approveSubmission payout is followed by a best-effort
// companion transaction to the Arc Memo contract that records reconciliation
// metadata. It never blocks or reverts the payout. See SECURITY.md / README.
export const ENABLE_ARC_MEMOS = process.env.NEXT_PUBLIC_ENABLE_ARC_MEMOS === "true";
export const ARC_MEMO_CONTRACT =
  process.env.NEXT_PUBLIC_ARC_MEMO_CONTRACT || "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";

export const arcMemoAbi = [
  {
    type: "function",
    name: "memo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" }
    ],
    outputs: []
  }
] as const;

export const critiqueDropBountyAbi = [
  {
    type: "event",
    name: "BountyCreated",
    inputs: [
      { indexed: true, name: "bountyId", type: "uint256" },
      { indexed: true, name: "founder", type: "address" },
      { indexed: false, name: "totalFundingRequired", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
      { indexed: false, name: "metadataURI", type: "string" }
    ]
  },
  {
    type: "event",
    name: "SubmissionApproved",
    inputs: [
      { indexed: true, name: "bountyId", type: "uint256" },
      { indexed: true, name: "feedbackTypeId", type: "bytes32" },
      { indexed: true, name: "tester", type: "address" },
      { indexed: false, name: "submissionHash", type: "bytes32" }
    ]
  },
  {
    type: "function",
    name: "createAndFundBounty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "feedbackTypeIds", type: "bytes32[]" },
      { name: "rewardAmounts", type: "uint256[]" },
      { name: "slotCounts", type: "uint256[]" },
      { name: "deadline", type: "uint256" },
      { name: "metadataURI", type: "string" }
    ],
    outputs: [{ name: "bountyId", type: "uint256" }]
  },
  {
    type: "function",
    name: "approveSubmission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "feedbackTypeId", type: "bytes32" },
      { name: "tester", type: "address" },
      { name: "submissionHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "refundUnused",
    stateMutability: "nonpayable",
    inputs: [{ name: "bountyId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "closeBounty",
    stateMutability: "nonpayable",
    inputs: [{ name: "bountyId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getBounty",
    stateMutability: "view",
    inputs: [{ name: "bountyId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "founder", type: "address" },
          { name: "fundedAmount", type: "uint256" },
          { name: "paidAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "metadataURI", type: "string" },
          { name: "closed", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "remainingFunds",
    stateMutability: "view",
    inputs: [{ name: "bountyId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getFeedbackTypeConfig",
    stateMutability: "view",
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "feedbackTypeId", type: "bytes32" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "rewardAmount", type: "uint256" },
          { name: "maxSlots", type: "uint256" },
          { name: "approvedCount", type: "uint256" },
          { name: "enabled", type: "bool" }
        ]
      }
    ]
  },
  // Custom errors — so viem can decode approval reverts into named errors.
  { type: "error", name: "BountyNotFound", inputs: [] },
  { type: "error", name: "InvalidAmount", inputs: [] },
  { type: "error", name: "InvalidDeadline", inputs: [] },
  { type: "error", name: "InvalidTester", inputs: [] },
  { type: "error", name: "InvalidFeedbackType", inputs: [] },
  { type: "error", name: "InvalidArrayLength", inputs: [] },
  { type: "error", name: "DuplicateFeedbackType", inputs: [] },
  { type: "error", name: "OnlyFounder", inputs: [] },
  { type: "error", name: "BountyClosedError", inputs: [] },
  { type: "error", name: "MaxSubmissionsReached", inputs: [] },
  { type: "error", name: "TesterAlreadyPaid", inputs: [] },
  { type: "error", name: "SubmissionHashAlreadyUsed", inputs: [] },
  { type: "error", name: "InsufficientBountyFunds", inputs: [] },
  { type: "error", name: "RefundUnavailable", inputs: [] }
] as const;
