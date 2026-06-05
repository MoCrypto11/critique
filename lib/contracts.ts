export const CRITIQUE_DROP_CONTRACT = process.env.NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT || "";
export const ENABLE_MOCK_MODE = process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE !== "false";

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
  }
] as const;
