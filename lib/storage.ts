import { createSubmissionHash } from "./hash";
import { FeedbackRewardConfig, FeedbackType, defaultFeedbackRewards, normalizeFeedbackRewards } from "./feedbackRewards";
import { isSupabaseConfigured, supabase } from "./supabase";

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
  feedbackRewards?: FeedbackRewardConfig[];
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
  feedbackType?: FeedbackType;
  feedbackTypeLabel?: string;
  expectedRewardUSDC?: string;
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

export class SharedDatabaseSaveError extends Error {
  reason: string;

  constructor(reason: string) {
    super("Could not save bounty to shared database.");
    this.name = "SharedDatabaseSaveError";
    this.reason = reason;
  }
}

export class SharedDatabasePreflightError extends Error {
  reason: string;

  constructor(reason: string) {
    super("Could not connect to the shared database. Please try again.");
    this.name = "SharedDatabasePreflightError";
    this.reason = reason;
  }
}

type BountyRow = {
  id: string;
  contract_bounty_id: string | null;
  founder_address: string | null;
  title: string;
  product_url: string;
  instructions: string;
  reward_usdc: string;
  feedback_config?: FeedbackRewardConfig[] | null;
  max_submissions: number;
  deadline: string;
  status: BountyMetadata["status"];
  created_at: string;
  tx_hashes: string[] | null;
};

type SubmissionRow = {
  id: string;
  bounty_id: string;
  tester_wallet: string;
  feedback_type: FeedbackSubmission["feedbackType"] | null;
  feedback_type_label?: string | null;
  expected_reward_usdc?: string | null;
  tester_context: string | null;
  first_impression: string | null;
  tried_first: string | null;
  confusion: string | null;
  value_clarity: string | null;
  hesitation: string | null;
  decision: FeedbackSubmission["decision"] | null;
  decision_reason: string | null;
  best_improvement: string | null;
  video_link: string | null;
  technical_background: string | null;
  technical_problem: string | null;
  technical_fix: string | null;
  expected_impact: string | null;
  difficulty: FeedbackSubmission["estimatedDifficulty"] | null;
  proof_link: string | null;
  submission_hash: string;
  status: FeedbackSubmission["status"];
  rejection_reason: string | null;
  payout_tx_hash: string | null;
  created_at: string;
};

function shouldUseSupabase() {
  return Boolean(isSupabaseConfigured && supabase);
}

export function usesSharedPersistence() {
  return shouldUseSupabase();
}

export async function ensureSharedDatabaseReachable() {
  if (!shouldUseSupabase() || !supabase) {
    if (process.env.NODE_ENV === "production") {
      throw new SharedDatabasePreflightError("Shared database is not configured.");
    }
    return;
  }

  const client = supabase;

  try {
    await withSupabaseErrors("shared database preflight", async () => {
      const { error } = await client.from("bounties").select("id").limit(1);
      throwSupabaseResponseError("shared database preflight", error);
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : "Shared database request failed.";
    throw new SharedDatabasePreflightError(reason);
  }
}

function throwSupabaseResponseError(action: string, error: { message?: string } | null) {
  if (!error) return;
  console.error(`[Critique shared database] ${action}`, error);
  throw new Error(error.message || "Shared database request failed.");
}

function normalizeSupabaseException(action: string, caught: unknown) {
  console.error(`[Critique shared database] ${action}`, caught);
  if (caught instanceof Error && caught.message === "Could not reach shared database.") {
    return caught;
  }
  if (caught instanceof TypeError || (caught instanceof Error && /failed to fetch/i.test(caught.message))) {
    return new Error("Could not reach shared database.");
  }
  if (caught instanceof Error) {
    return new Error(caught.message || "Shared database request failed.");
  }
  return new Error("Shared database request failed.");
}

async function withSupabaseErrors<T>(action: string, task: () => Promise<T>) {
  try {
    return await task();
  } catch (caught) {
    throw normalizeSupabaseException(action, caught);
  }
}

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

function sameWalletAddress(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function toBounty(row: BountyRow): BountyMetadata {
  return {
    id: row.id,
    contractBountyId: row.contract_bounty_id || undefined,
    founderAddress: row.founder_address || undefined,
    title: row.title,
    productUrl: row.product_url,
    instructions: row.instructions,
    rewardUSDC: row.reward_usdc,
    feedbackRewards: normalizeFeedbackRewards(row.feedback_config, row.reward_usdc, row.max_submissions),
    maxSubmissions: row.max_submissions,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at,
    txHashes: row.tx_hashes || []
  };
}

function toBountyRow(bounty: BountyMetadata) {
  return {
    id: bounty.id,
    contract_bounty_id: bounty.contractBountyId || null,
    founder_address: bounty.founderAddress || null,
    title: bounty.title,
    product_url: bounty.productUrl,
    instructions: bounty.instructions,
    reward_usdc: bounty.rewardUSDC,
    feedback_config: normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions),
    max_submissions: bounty.maxSubmissions,
    deadline: bounty.deadline,
    status: bounty.status,
    created_at: bounty.createdAt,
    tx_hashes: bounty.txHashes
  };
}

function toSubmission(row: SubmissionRow): FeedbackSubmission {
  const isVideo = row.feedback_type === "video_walkthrough";
  const isTechnical = row.feedback_type === "technical_proposal";

  return {
    id: row.id,
    bountyId: row.bounty_id,
    testerWallet: row.tester_wallet,
    feedbackType: row.feedback_type || undefined,
    feedbackTypeLabel: row.feedback_type_label || undefined,
    expectedRewardUSDC: row.expected_reward_usdc || undefined,
    testerContext: row.tester_context || undefined,
    firstImpression: isVideo ? undefined : row.first_impression || undefined,
    firstAction: row.tried_first || undefined,
    confusionAnswer: isVideo ? undefined : row.confusion || undefined,
    valueClarity: isTechnical ? undefined : row.value_clarity || undefined,
    hesitation: row.hesitation || undefined,
    decision: row.decision || undefined,
    decisionReason: row.decision_reason || undefined,
    bestImprovement: isVideo ? undefined : row.best_improvement || undefined,
    proofLink: !isTechnical ? row.proof_link || undefined : undefined,
    videoLink: row.video_link || undefined,
    videoSummary: isVideo ? row.first_impression || undefined : undefined,
    biggestIssue: isVideo ? row.confusion || undefined : undefined,
    videoImprovement: isVideo ? row.best_improvement || undefined : undefined,
    contributorBackground: row.technical_background || undefined,
    technicalProblem: row.technical_problem || undefined,
    technicalWhy: isTechnical ? row.value_clarity || undefined : undefined,
    suggestedFix: row.technical_fix || undefined,
    expectedImpact: row.expected_impact || undefined,
    estimatedDifficulty: row.difficulty || undefined,
    referenceLink: isTechnical ? row.proof_link || undefined : undefined,
    status: row.status,
    rejectionReason: row.rejection_reason || undefined,
    submissionHash: row.submission_hash,
    payoutTxHash: row.payout_tx_hash || undefined,
    createdAt: row.created_at
  };
}

function toSubmissionRow(submission: FeedbackSubmission) {
  const isVideo = submission.feedbackType === "video_walkthrough";
  const isTechnical = submission.feedbackType === "technical_proposal";

  return {
    id: submission.id,
    bounty_id: submission.bountyId,
    tester_wallet: submission.testerWallet,
    feedback_type: submission.feedbackType || null,
    feedback_type_label: submission.feedbackTypeLabel || null,
    expected_reward_usdc: submission.expectedRewardUSDC || null,
    tester_context: submission.testerContext || null,
    first_impression: isVideo ? submission.videoSummary || null : submission.firstImpression || null,
    tried_first: submission.firstAction || null,
    confusion: isVideo ? submission.biggestIssue || null : submission.confusionAnswer || null,
    value_clarity: isTechnical ? submission.technicalWhy || null : submission.valueClarity || null,
    hesitation: submission.hesitation || null,
    decision: submission.decision || null,
    decision_reason: submission.decisionReason || null,
    best_improvement: isVideo ? submission.videoImprovement || null : submission.bestImprovement || null,
    video_link: submission.videoLink || null,
    technical_background: submission.contributorBackground || null,
    technical_problem: submission.technicalProblem || null,
    technical_fix: submission.suggestedFix || null,
    expected_impact: submission.expectedImpact || null,
    difficulty: submission.estimatedDifficulty || null,
    proof_link: submission.referenceLink || submission.proofLink || null,
    submission_hash: submission.submissionHash,
    status: submission.status,
    rejection_reason: submission.rejectionReason || null,
    payout_tx_hash: submission.payoutTxHash || null,
    created_at: submission.createdAt
  };
}

async function upsertSupabaseBounty(bounty: BountyMetadata) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const client = supabase;
  return withSupabaseErrors("upsert bounty", async () => {
    const { error } = await client.from("bounties").upsert(toBountyRow(bounty));
    throwSupabaseResponseError("upsert bounty", error);
    return bounty;
  });
}

export function buildLocalBounty(input: Omit<BountyMetadata, "id" | "status" | "createdAt" | "txHashes">): BountyMetadata {
  return {
    ...input,
    id: newId("bounty"),
    status: "open",
    createdAt: new Date().toISOString(),
    txHashes: []
  };
}

export async function saveLocalBounty(bounty: BountyMetadata) {
  if (shouldUseSupabase()) {
    try {
      return await upsertSupabaseBounty(bounty);
    } catch (caught) {
      console.error("[Critique shared database] create bounty save failed", caught);
      const reason = caught instanceof Error ? caught.message : "Unknown shared database error.";

      if (bounty.contractBountyId) {
        throw new SharedDatabaseSaveError(reason);
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("[Critique shared database] falling back to localStorage in development only.");
        saveBounties([bounty, ...getBounties()]);
        return bounty;
      }

      throw new SharedDatabaseSaveError(reason);
    }
  }

  saveBounties([bounty, ...getBounties()]);
  return bounty;
}

export async function createLocalBounty(input: Omit<BountyMetadata, "id" | "status" | "createdAt" | "txHashes">) {
  return saveLocalBounty(buildLocalBounty(input));
}

export async function getLocalBounty(id: string) {
  if (id === "demo") return getDemoBounty();

  if (shouldUseSupabase() && supabase) {
    const client = supabase;
    return withSupabaseErrors("read bounty", async () => {
      const { data, error } = await client.from("bounties").select("*").eq("id", id).maybeSingle();
      throwSupabaseResponseError("read bounty", error);
      if (!data) return undefined;
      const bounty = toBounty(data as BountyRow);
      if (new Date(bounty.deadline).getTime() < Date.now() && bounty.status === "open") {
        return updateLocalBounty(id, { status: "expired" });
      }
      return bounty;
    });
  }

  const bounty = getBounties().find((item) => item.id === id);
  if (!bounty) return undefined;
  if (new Date(bounty.deadline).getTime() < Date.now() && bounty.status === "open") {
    return updateLocalBounty(id, { status: "expired" });
  }
  return bounty;
}

export async function listLocalBounties() {
  if (shouldUseSupabase() && supabase) {
    const client = supabase;
    return withSupabaseErrors("list bounties", async () => {
      const { data, error } = await client.from("bounties").select("*").order("created_at", { ascending: false });
      throwSupabaseResponseError("list bounties", error);
      return (data as BountyRow[]).map(toBounty);
    });
  }

  const bounties = getBounties();
  return bounties.some((bounty) => bounty.id === "demo") ? bounties : [getDemoBounty(), ...bounties];
}

export async function listBountiesByFounder(founderAddress: string) {
  if (!founderAddress) return [];

  if (shouldUseSupabase() && supabase) {
    const client = supabase;
    return withSupabaseErrors("list founder bounties", async () => {
      const { data, error } = await client
        .from("bounties")
        .select("*")
        .ilike("founder_address", founderAddress)
        .order("created_at", { ascending: false });
      throwSupabaseResponseError("list founder bounties", error);
      return (data as BountyRow[]).map(toBounty);
    });
  }

  return getBounties()
    .filter((bounty) => sameWalletAddress(bounty.founderAddress, founderAddress))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listBountiesByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return [];

  if (shouldUseSupabase() && supabase) {
    const client = supabase;
    return withSupabaseErrors("list bounties by id", async () => {
      const { data, error } = await client.from("bounties").select("*").in("id", uniqueIds);
      throwSupabaseResponseError("list bounties by id", error);
      const bounties = (data as BountyRow[]).map(toBounty);
      return uniqueIds.includes("demo") ? [getDemoBounty(), ...bounties] : bounties;
    });
  }

  const bounties = getBounties();
  const available = uniqueIds.includes("demo") ? [getDemoBounty(), ...bounties] : bounties;
  return available.filter((bounty) => uniqueIds.includes(bounty.id));
}

export async function updateLocalBounty(id: string, updates: Partial<BountyMetadata>) {
  if (shouldUseSupabase() && supabase && id !== "demo") {
    const client = supabase;
    return withSupabaseErrors("update bounty", async () => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.contractBountyId !== undefined) dbUpdates.contract_bounty_id = updates.contractBountyId;
      if (updates.founderAddress !== undefined) dbUpdates.founder_address = updates.founderAddress;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.productUrl !== undefined) dbUpdates.product_url = updates.productUrl;
      if (updates.instructions !== undefined) dbUpdates.instructions = updates.instructions;
      if (updates.rewardUSDC !== undefined) dbUpdates.reward_usdc = updates.rewardUSDC;
      if (updates.feedbackRewards !== undefined) dbUpdates.feedback_config = updates.feedbackRewards;
      if (updates.maxSubmissions !== undefined) dbUpdates.max_submissions = updates.maxSubmissions;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;
      if (updates.txHashes !== undefined) dbUpdates.tx_hashes = updates.txHashes;

      const { data, error } = await client.from("bounties").update(dbUpdates).eq("id", id).select("*").maybeSingle();
      throwSupabaseResponseError("update bounty", error);
      return data ? toBounty(data as BountyRow) : undefined;
    });
  }

  const bounties = getBounties();
  const next = bounties.map((bounty) => (bounty.id === id ? { ...bounty, ...updates } : bounty));
  saveBounties(next);
  return next.find((bounty) => bounty.id === id);
}

export async function addSubmission(input: Omit<FeedbackSubmission, "id" | "status" | "submissionHash" | "createdAt">) {
  const id = newId("submission");
  const submissionHash = createSubmissionHash({ ...input, submissionId: id });
  const submission: FeedbackSubmission = {
    ...input,
    id,
    status: "pending",
    submissionHash,
    createdAt: new Date().toISOString()
  };

  if (shouldUseSupabase() && supabase && input.bountyId !== "demo") {
    const client = supabase;
    return withSupabaseErrors("insert submission", async () => {
      const submissionRow = toSubmissionRow(submission);
      const { error } = await client.from("submissions").insert(submissionRow);
      if (error && /feedback_type_label|expected_reward_usdc|schema cache/i.test(error.message || "")) {
        const { feedback_type_label, expected_reward_usdc, ...legacySubmissionRow } = submissionRow;
        const { error: legacyError } = await client.from("submissions").insert(legacySubmissionRow);
        throwSupabaseResponseError("insert submission", legacyError);
      } else {
        throwSupabaseResponseError("insert submission", error);
      }
      return submission;
    });
  }

  saveSubmissions([submission, ...getSubmissions()]);
  return submission;
}

export async function listSubmissions(bountyId: string) {
  if (shouldUseSupabase() && supabase && bountyId !== "demo") {
    const client = supabase;
    return withSupabaseErrors("list submissions", async () => {
      const { data, error } = await client
        .from("submissions")
        .select("*")
        .eq("bounty_id", bountyId)
        .order("created_at", { ascending: false });
      throwSupabaseResponseError("list submissions", error);
      return (data as SubmissionRow[]).map(toSubmission);
    });
  }

  return getSubmissions().filter((submission) => submission.bountyId === bountyId);
}

// Content-free summary for PUBLIC consumers (the public bounty page only needs
// status / type / wallet to compute slots and dedup). It never selects the
// off-chain feedback answer columns, so feedback content is never sent to
// public clients. NOTE: the real enforcement boundary is Supabase RLS — see
// SECURITY.md. This only limits what the app fetches.
export type SubmissionSummary = {
  id: string;
  bountyId: string;
  status: FeedbackSubmission["status"];
  feedbackType?: FeedbackType;
  expectedRewardUSDC?: string;
  createdAt: string;
};

export async function listSubmissionSummaries(bountyId: string): Promise<SubmissionSummary[]> {
  if (shouldUseSupabase() && supabase && bountyId !== "demo") {
    const client = supabase;
    return withSupabaseErrors("list submission summaries", async () => {
      const { data, error } = await client
        .from("submissions")
        .select("id, bounty_id, status, feedback_type, expected_reward_usdc, created_at")
        .eq("bounty_id", bountyId)
        .order("created_at", { ascending: false });
      throwSupabaseResponseError("list submission summaries", error);
      return (
        data as Array<{
          id: string;
          bounty_id: string;
          status: FeedbackSubmission["status"];
          feedback_type: FeedbackType | null;
          expected_reward_usdc: string | null;
          created_at: string;
        }>
      ).map((row) => ({
        id: row.id,
        bountyId: row.bounty_id,
        status: row.status,
        feedbackType: row.feedback_type || undefined,
        expectedRewardUSDC: row.expected_reward_usdc || undefined,
        createdAt: row.created_at
      }));
    });
  }

  return getSubmissions()
    .filter((submission) => submission.bountyId === bountyId)
    .map((submission) => ({
      id: submission.id,
      bountyId: submission.bountyId,
      status: submission.status,
      feedbackType: submission.feedbackType,
      expectedRewardUSDC: submission.expectedRewardUSDC,
      createdAt: submission.createdAt
    }));
}

export async function listSubmissionsByTester(testerWallet: string) {
  if (!testerWallet) return [];

  if (shouldUseSupabase() && supabase) {
    const client = supabase;
    return withSupabaseErrors("list tester submissions", async () => {
      const { data, error } = await client
        .from("submissions")
        .select("*")
        .ilike("tester_wallet", testerWallet)
        .order("created_at", { ascending: false });
      throwSupabaseResponseError("list tester submissions", error);
      return (data as SubmissionRow[]).map(toSubmission);
    });
  }

  return getSubmissions()
    .filter((submission) => sameWalletAddress(submission.testerWallet, testerWallet))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function approveLocalSubmission(bountyId: string, submissionId: string, payoutTxHash?: string) {
  if (shouldUseSupabase() && supabase && bountyId !== "demo") {
    const client = supabase;
    return withSupabaseErrors("approve submission", async () => {
      const { data, error } = await client
        .from("submissions")
        .update({ status: "approved", payout_tx_hash: payoutTxHash || null })
        .eq("bounty_id", bountyId)
        .eq("id", submissionId)
        .select("*")
        .maybeSingle();
      throwSupabaseResponseError("approve submission", error);
      return data ? toSubmission(data as SubmissionRow) : undefined;
    });
  }

  const submissions = getSubmissions();
  const next = submissions.map((submission) =>
    submission.bountyId === bountyId && submission.id === submissionId
      ? { ...submission, status: "approved" as const, payoutTxHash }
      : submission
  );
  saveSubmissions(next);
  return next.find((submission) => submission.id === submissionId);
}

export async function rejectLocalSubmission(bountyId: string, submissionId: string, rejectionReason: string) {
  if (shouldUseSupabase() && supabase && bountyId !== "demo") {
    const client = supabase;
    return withSupabaseErrors("reject submission", async () => {
      const { data, error } = await client
        .from("submissions")
        .update({ status: "rejected", rejection_reason: rejectionReason })
        .eq("bounty_id", bountyId)
        .eq("id", submissionId)
        .select("*")
        .maybeSingle();
      throwSupabaseResponseError("reject submission", error);
      return data ? toSubmission(data as SubmissionRow) : undefined;
    });
  }

  const submissions = getSubmissions();
  const next = submissions.map((submission) =>
    submission.bountyId === bountyId && submission.id === submissionId
      ? { ...submission, status: "rejected" as const, rejectionReason }
      : submission
  );
  saveSubmissions(next);
  return next.find((submission) => submission.id === submissionId);
}

export async function addTxHashToBounty(bountyId: string, txHash: string) {
  const bounty = await getLocalBounty(bountyId);
  if (!bounty) return undefined;
  return updateLocalBounty(bountyId, { txHashes: [...bounty.txHashes, txHash] });
}

export function getDemoBounty(): BountyMetadata {
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    id: "demo",
    title: "Test my landing page",
    productUrl: "https://example.com",
    instructions:
      "Spend 3 minutes reviewing this product page. Share what is clear, where the experience creates friction, and what improvement would make the product easier to evaluate.",
    rewardUSDC: "7",
    feedbackRewards: defaultFeedbackRewards,
    maxSubmissions: 5,
    deadline,
    status: "open",
    createdAt: new Date().toISOString(),
    txHashes: []
  };
}

export async function ensureDemoBounty() {
  return getDemoBounty();
}
