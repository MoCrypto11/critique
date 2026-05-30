import { createSubmissionHash } from "./hash";

const BOUNTIES_KEY = "critique-drop:bounties";
const SUBMISSIONS_KEY = "critique-drop:submissions";

export type BountyMetadata = {
  id: string;
  contractBountyId?: string;
  founderAddress?: string;
  title: string;
  productUrl: string;
  instructions: string;
  rewardUSDC: string;
  maxSubmissions: number;
  deadline: string;
  status: "draft" | "open" | "closed" | "expired";
  createdAt: string;
  txHashes: string[];
};

export type FeedbackSubmission = {
  id: string;
  bountyId: string;
  testerWallet: string;
  feedbackType?: "quick_written" | "deep_product_review" | "video_walkthrough" | "technical_proposal";
  testerContext?: string;
  firstImpression?: string;
  firstAction?: string;
  confusionAnswer?: string;
  valueClarity?: string;
  hesitation?: string;
  decision?: "Yes" | "Maybe" | "No";
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
  estimatedDifficulty?: "Low" | "Medium" | "High";
  referenceLink?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  submissionHash: string;
  payoutTxHash?: string;
  createdAt: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getBounties() {
  return read<BountyMetadata[]>(BOUNTIES_KEY, []);
}

function saveBounties(bounties: BountyMetadata[]) {
  write(BOUNTIES_KEY, bounties);
}

function getSubmissions() {
  return read<FeedbackSubmission[]>(SUBMISSIONS_KEY, []);
}

function saveSubmissions(submissions: FeedbackSubmission[]) {
  write(SUBMISSIONS_KEY, submissions);
}

export function createLocalBounty(input: Omit<BountyMetadata, "id" | "status" | "createdAt" | "txHashes">) {
  const bounty: BountyMetadata = {
    ...input,
    id: newId("bounty"),
    status: "open",
    createdAt: new Date().toISOString(),
    txHashes: []
  };
  saveBounties([bounty, ...getBounties()]);
  return bounty;
}

export function getLocalBounty(id: string) {
  if (id === "demo") return ensureDemoBounty();
  const bounty = getBounties().find((item) => item.id === id);
  if (!bounty) return undefined;
  if (new Date(bounty.deadline).getTime() < Date.now() && bounty.status === "open") {
    return updateLocalBounty(id, { status: "expired" });
  }
  return bounty;
}

export function listLocalBounties() {
  ensureDemoBounty();
  return getBounties();
}

export function updateLocalBounty(id: string, updates: Partial<BountyMetadata>) {
  const bounties = getBounties();
  const next = bounties.map((bounty) => (bounty.id === id ? { ...bounty, ...updates } : bounty));
  saveBounties(next);
  return next.find((bounty) => bounty.id === id);
}

export function addSubmission(input: Omit<FeedbackSubmission, "id" | "status" | "submissionHash" | "createdAt">) {
  const id = newId("submission");
  const submissionHash = createSubmissionHash({ ...input, submissionId: id });
  const submission: FeedbackSubmission = {
    ...input,
    id,
    status: "pending",
    submissionHash,
    createdAt: new Date().toISOString()
  };
  saveSubmissions([submission, ...getSubmissions()]);
  return submission;
}

export function listSubmissions(bountyId: string) {
  return getSubmissions().filter((submission) => submission.bountyId === bountyId);
}

export function approveLocalSubmission(bountyId: string, submissionId: string, payoutTxHash?: string) {
  const submissions = getSubmissions();
  const next = submissions.map((submission) =>
    submission.bountyId === bountyId && submission.id === submissionId
      ? { ...submission, status: "approved" as const, payoutTxHash }
      : submission
  );
  saveSubmissions(next);
  return next.find((submission) => submission.id === submissionId);
}

export function rejectLocalSubmission(bountyId: string, submissionId: string, rejectionReason: string) {
  const submissions = getSubmissions();
  const next = submissions.map((submission) =>
    submission.bountyId === bountyId && submission.id === submissionId
      ? { ...submission, status: "rejected" as const, rejectionReason }
      : submission
  );
  saveSubmissions(next);
  return next.find((submission) => submission.id === submissionId);
}

export function addTxHashToBounty(bountyId: string, txHash: string) {
  const bounty = getLocalBounty(bountyId);
  if (!bounty) return undefined;
  return updateLocalBounty(bountyId, { txHashes: [...bounty.txHashes, txHash] });
}

export function ensureDemoBounty() {
  const existing = getBounties().find((item) => item.id === "demo");
  if (existing) return existing;

  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const demo: BountyMetadata = {
    id: "demo",
    title: "Test my landing page",
    productUrl: "https://example.com",
    instructions:
      "Spend 3 minutes on this page. Tell me what confused you, what you understood clearly, and whether you would click the main call-to-action.",
    rewardUSDC: "1",
    maxSubmissions: 5,
    deadline,
    status: "open",
    createdAt: new Date().toISOString(),
    txHashes: []
  };

  saveBounties([demo, ...getBounties()]);
  return demo;
}
