import { keccak256, stringToBytes } from "viem";

// Feature flag for the campaign escrow surface (default OFF so the existing
// bounty product is unaffected until campaigns are explicitly enabled).
export const ENABLE_CAMPAIGNS = process.env.NEXT_PUBLIC_ENABLE_CAMPAIGNS === "true";

// Deployed CritiqueCampaignEscrowV1 address. Empty = campaign chain actions
// run in local mock mode (mirrors the bounty contract pattern).
export const CRITIQUE_CAMPAIGN_CONTRACT = process.env.NEXT_PUBLIC_CRITIQUE_CAMPAIGN_CONTRACT || "";

export const DEFAULT_DISPUTE_WINDOW_SECONDS = 24 * 60 * 60; // 24h founder cancel window

/// Deterministic submission reference used onchain. The feedback content
/// itself stays offchain; only this hash is written to the contract.
export function createCampaignSubmissionHash(input: {
  campaignId: string;
  taskId: string;
  contributorWallet: string;
  content: string;
  proofUrl?: string;
  submissionId: string;
}) {
  const normalized = [
    input.campaignId,
    input.taskId,
    input.contributorWallet.toLowerCase(),
    input.content.trim(),
    (input.proofUrl || "").trim(),
    input.submissionId
  ].join("|");
  return keccak256(stringToBytes(normalized));
}

export function createEvaluationHash(evaluationJson: string) {
  return keccak256(stringToBytes(evaluationJson));
}

export const critiqueCampaignEscrowAbi = [
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "founder", type: "address" },
      { indexed: true, name: "allowedAgent", type: "address" },
      { indexed: false, name: "initialFunding", type: "uint256" },
      { indexed: false, name: "maxRewardPerTask", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
      { indexed: false, name: "disputeWindow", type: "uint64" },
      { indexed: false, name: "autoPayEnabled", type: "bool" },
      { indexed: false, name: "metadataURI", type: "string" }
    ]
  },
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { indexed: true, name: "taskId", type: "uint256" },
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: false, name: "reward", type: "uint256" },
      { indexed: false, name: "maxPayouts", type: "uint32" },
      { indexed: false, name: "active", type: "bool" },
      { indexed: false, name: "metadataURI", type: "string" }
    ]
  },
  {
    type: "event",
    name: "PayoutQueued",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "taskId", type: "uint256" },
      { indexed: true, name: "submissionHash", type: "bytes32" },
      { indexed: false, name: "contributor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "executableAt", type: "uint64" },
      { indexed: false, name: "evaluationHash", type: "bytes32" },
      { indexed: false, name: "evaluationURI", type: "string" }
    ]
  },
  {
    type: "event",
    name: "PayoutExecuted",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "taskId", type: "uint256" },
      { indexed: true, name: "submissionHash", type: "bytes32" },
      { indexed: false, name: "contributor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "direct", type: "bool" }
    ]
  },
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "allowedAgent", type: "address" },
      { name: "initialFunding", type: "uint256" },
      { name: "maxRewardPerTask", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "disputeWindow", type: "uint64" },
      { name: "autoPayEnabled", type: "bool" },
      { name: "metadataURI", type: "string" },
      { name: "criteriaHash", type: "bytes32" }
    ],
    outputs: [{ name: "campaignId", type: "uint256" }]
  },
  {
    type: "function",
    name: "fundCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "createTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "reward", type: "uint256" },
      { name: "maxPayouts", type: "uint32" },
      { name: "publish", type: "bool" },
      { name: "metadataURI", type: "string" },
      { name: "criteriaHash", type: "bytes32" }
    ],
    outputs: [{ name: "taskId", type: "uint256" }]
  },
  {
    type: "function",
    name: "setTaskActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "closeTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "founderApproveAndPay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "taskId", type: "uint256" },
      { name: "contributor", type: "address" },
      { name: "submissionHash", type: "bytes32" },
      { name: "evaluationHash", type: "bytes32" },
      { name: "evaluationURI", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "agentQueuePayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "taskId", type: "uint256" },
      { name: "contributor", type: "address" },
      { name: "submissionHash", type: "bytes32" },
      { name: "evaluationHash", type: "bytes32" },
      { name: "evaluationURI", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "founderCancelQueuedPayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "submissionHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "executeQueuedPayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "submissionHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "founderRejectSubmission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "submissionHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setCampaignPaused",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "paused", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "closeCampaign",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "refundUnusedBudget",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "setAllowedAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "agent", type: "address" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setAutoPayEnabled",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "enabled", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "getCampaign",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "founder", type: "address" },
          { name: "allowedAgent", type: "address" },
          { name: "totalBudget", type: "uint256" },
          { name: "spent", type: "uint256" },
          { name: "reserved", type: "uint256" },
          { name: "maxRewardPerTask", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "disputeWindow", type: "uint64" },
          { name: "autoPayEnabled", type: "bool" },
          { name: "paused", type: "bool" },
          { name: "closed", type: "bool" },
          { name: "criteriaHash", type: "bytes32" },
          { name: "metadataURI", type: "string" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getPayout",
    stateMutability: "view",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "submissionHash", type: "bytes32" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "taskId", type: "uint256" },
          { name: "contributor", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "queuedAt", type: "uint64" },
          { name: "state", type: "uint8" },
          { name: "evaluationHash", type: "bytes32" },
          { name: "evaluationURI", type: "string" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "remainingBudget",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;
