import { isSupabaseConfigured, supabase } from "./supabase";

// Offchain persistence for feedback campaigns. Follows the same pattern as
// lib/storage.ts: Supabase when configured, localStorage fallback otherwise.
// Campaign data lives in its own tables (campaigns / campaign_tasks /
// campaign_submissions) so the existing bounty flow and its schema are
// untouched. Migration SQL: supabase/migrations/20260702_campaigns.sql

const CAMPAIGNS_KEY = "critique-drop:campaigns";
const CAMPAIGN_TASKS_KEY = "critique-drop:campaign-tasks";
const CAMPAIGN_SUBMISSIONS_KEY = "critique-drop:campaign-submissions";

export type RiskLevel = "low" | "medium" | "high";
export type CampaignApprovalMode = "founder" | "agent_queued";

export type Campaign = {
  id: string;
  chainCampaignId?: string;
  founderAddress?: string;
  allowedAgentAddress?: string;
  title: string;
  productUrl: string;
  goal: string;
  instructions?: string;
  acceptanceCriteria: string[];
  spamRules?: string;
  totalBudgetUSDC: string;
  maxRewardPerTaskUSDC: string;
  deadline: string;
  approvalMode: CampaignApprovalMode;
  autoPayEnabled: boolean;
  disputeWindowSeconds: number;
  requireProof: boolean;
  status: "open" | "paused" | "closed";
  txHash?: string;
  createdAt: string;
};

export type CampaignTask = {
  id: string;
  campaignId: string;
  chainTaskId?: string;
  title: string;
  category?: string;
  rewardUSDC: string;
  maxPayouts: number;
  criteria: string[];
  requiredProof: string[];
  expectedDeliverable?: string;
  aiReason?: string;
  creatorType: "founder" | "ai";
  status: "draft" | "active" | "closed";
  txHash?: string;
  createdAt: string;
};

export type CampaignSubmission = {
  id: string;
  campaignId: string;
  taskId: string;
  contributorWallet: string;
  content: string;
  proofUrl?: string;
  submissionHash: string;
  status: "pending" | "queued" | "approved" | "rejected" | "paid" | "cancelled";
  aiSummary?: string;
  aiQualityScore?: number;
  aiCriteriaMatch?: RiskLevel;
  aiSpamRisk?: RiskLevel;
  aiDuplicateRisk?: RiskLevel;
  aiSuggestedAction?: string;
  aiReason?: string;
  evaluationHash?: string;
  rejectionReason?: string;
  payoutTxHash?: string;
  queuedAt?: string;
  paidAt?: string;
  createdAt: string;
};

function shouldUseSupabase() {
  return isSupabaseConfigured && Boolean(supabase);
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function throwOnError(context: string, error: { message: string } | null) {
  if (error) throw new Error(`Could not ${context}: ${error.message}`);
}

// ─── Row mapping ───────────────────────────────────────────────────────────

type CampaignRow = {
  id: string;
  chain_campaign_id: string | null;
  founder_address: string | null;
  allowed_agent_address: string | null;
  title: string;
  product_url: string;
  goal: string;
  instructions: string | null;
  acceptance_criteria: string[] | null;
  spam_rules: string | null;
  total_budget: string;
  max_reward_per_task: string;
  deadline: string;
  approval_mode: string;
  auto_pay_enabled: boolean;
  dispute_window: number;
  require_proof: boolean;
  status: string;
  tx_hash: string | null;
  created_at: string;
};

function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    chainCampaignId: row.chain_campaign_id || undefined,
    founderAddress: row.founder_address || undefined,
    allowedAgentAddress: row.allowed_agent_address || undefined,
    title: row.title,
    productUrl: row.product_url,
    goal: row.goal,
    instructions: row.instructions || undefined,
    acceptanceCriteria: row.acceptance_criteria || [],
    spamRules: row.spam_rules || undefined,
    totalBudgetUSDC: row.total_budget,
    maxRewardPerTaskUSDC: row.max_reward_per_task,
    deadline: row.deadline,
    approvalMode: (row.approval_mode as CampaignApprovalMode) || "founder",
    autoPayEnabled: row.auto_pay_enabled,
    disputeWindowSeconds: row.dispute_window,
    requireProof: row.require_proof,
    status: (row.status as Campaign["status"]) || "open",
    txHash: row.tx_hash || undefined,
    createdAt: row.created_at
  };
}

function toCampaignRow(campaign: Campaign) {
  return {
    id: campaign.id,
    chain_campaign_id: campaign.chainCampaignId || null,
    founder_address: campaign.founderAddress || null,
    allowed_agent_address: campaign.allowedAgentAddress || null,
    title: campaign.title,
    product_url: campaign.productUrl,
    goal: campaign.goal,
    instructions: campaign.instructions || null,
    acceptance_criteria: campaign.acceptanceCriteria,
    spam_rules: campaign.spamRules || null,
    total_budget: campaign.totalBudgetUSDC,
    max_reward_per_task: campaign.maxRewardPerTaskUSDC,
    deadline: campaign.deadline,
    approval_mode: campaign.approvalMode,
    auto_pay_enabled: campaign.autoPayEnabled,
    dispute_window: campaign.disputeWindowSeconds,
    require_proof: campaign.requireProof,
    status: campaign.status,
    tx_hash: campaign.txHash || null,
    created_at: campaign.createdAt
  };
}

type TaskRow = {
  id: string;
  campaign_id: string;
  chain_task_id: string | null;
  title: string;
  category: string | null;
  reward: string;
  max_payouts: number;
  criteria: string[] | null;
  required_proof: string[] | null;
  expected_deliverable: string | null;
  ai_reason: string | null;
  creator_type: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
};

function toTask(row: TaskRow): CampaignTask {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    chainTaskId: row.chain_task_id || undefined,
    title: row.title,
    category: row.category || undefined,
    rewardUSDC: row.reward,
    maxPayouts: row.max_payouts,
    criteria: row.criteria || [],
    requiredProof: row.required_proof || [],
    expectedDeliverable: row.expected_deliverable || undefined,
    aiReason: row.ai_reason || undefined,
    creatorType: (row.creator_type as CampaignTask["creatorType"]) || "founder",
    status: (row.status as CampaignTask["status"]) || "draft",
    txHash: row.tx_hash || undefined,
    createdAt: row.created_at
  };
}

function toTaskRow(task: CampaignTask) {
  return {
    id: task.id,
    campaign_id: task.campaignId,
    chain_task_id: task.chainTaskId || null,
    title: task.title,
    category: task.category || null,
    reward: task.rewardUSDC,
    max_payouts: task.maxPayouts,
    criteria: task.criteria,
    required_proof: task.requiredProof,
    expected_deliverable: task.expectedDeliverable || null,
    ai_reason: task.aiReason || null,
    creator_type: task.creatorType,
    status: task.status,
    tx_hash: task.txHash || null,
    created_at: task.createdAt
  };
}

type SubmissionRow = {
  id: string;
  campaign_id: string;
  task_id: string;
  contributor_wallet: string;
  content: string;
  proof_url: string | null;
  submission_hash: string;
  status: string;
  ai_summary: string | null;
  ai_quality_score: number | null;
  ai_criteria_match: string | null;
  ai_spam_risk: string | null;
  ai_duplicate_risk: string | null;
  ai_suggested_action: string | null;
  ai_reason: string | null;
  evaluation_hash: string | null;
  rejection_reason: string | null;
  payout_tx_hash: string | null;
  queued_at: string | null;
  paid_at: string | null;
  created_at: string;
};

function toSubmission(row: SubmissionRow): CampaignSubmission {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    taskId: row.task_id,
    contributorWallet: row.contributor_wallet,
    content: row.content,
    proofUrl: row.proof_url || undefined,
    submissionHash: row.submission_hash,
    status: (row.status as CampaignSubmission["status"]) || "pending",
    aiSummary: row.ai_summary || undefined,
    aiQualityScore: row.ai_quality_score ?? undefined,
    aiCriteriaMatch: (row.ai_criteria_match as RiskLevel) || undefined,
    aiSpamRisk: (row.ai_spam_risk as RiskLevel) || undefined,
    aiDuplicateRisk: (row.ai_duplicate_risk as RiskLevel) || undefined,
    aiSuggestedAction: row.ai_suggested_action || undefined,
    aiReason: row.ai_reason || undefined,
    evaluationHash: row.evaluation_hash || undefined,
    rejectionReason: row.rejection_reason || undefined,
    payoutTxHash: row.payout_tx_hash || undefined,
    queuedAt: row.queued_at || undefined,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at
  };
}

function toSubmissionRow(submission: CampaignSubmission) {
  return {
    id: submission.id,
    campaign_id: submission.campaignId,
    task_id: submission.taskId,
    contributor_wallet: submission.contributorWallet,
    content: submission.content,
    proof_url: submission.proofUrl || null,
    submission_hash: submission.submissionHash,
    status: submission.status,
    ai_summary: submission.aiSummary || null,
    ai_quality_score: submission.aiQualityScore ?? null,
    ai_criteria_match: submission.aiCriteriaMatch || null,
    ai_spam_risk: submission.aiSpamRisk || null,
    ai_duplicate_risk: submission.aiDuplicateRisk || null,
    ai_suggested_action: submission.aiSuggestedAction || null,
    ai_reason: submission.aiReason || null,
    evaluation_hash: submission.evaluationHash || null,
    rejection_reason: submission.rejectionReason || null,
    payout_tx_hash: submission.payoutTxHash || null,
    queued_at: submission.queuedAt || null,
    paid_at: submission.paidAt || null,
    created_at: submission.createdAt
  };
}

// ─── Campaigns ─────────────────────────────────────────────────────────────

export function buildCampaign(
  input: Omit<Campaign, "id" | "status" | "createdAt">
): Campaign {
  return { ...input, id: generateId("campaign"), status: "open", createdAt: new Date().toISOString() };
}

export async function saveCampaign(campaign: Campaign) {
  if (shouldUseSupabase() && supabase) {
    const { error } = await supabase.from("campaigns").upsert(toCampaignRow(campaign));
    throwOnError("save campaign", error);
    return campaign;
  }
  const rows = readLocal<Campaign>(CAMPAIGNS_KEY).filter((row) => row.id !== campaign.id);
  writeLocal(CAMPAIGNS_KEY, [...rows, campaign]);
  return campaign;
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    throwOnError("load campaign", error);
    return data ? toCampaign(data as CampaignRow) : undefined;
  }
  return readLocal<Campaign>(CAMPAIGNS_KEY).find((row) => row.id === id);
}

export async function listCampaignsByFounder(founderAddress: string): Promise<Campaign[]> {
  if (!founderAddress) return [];
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .ilike("founder_address", founderAddress)
      .order("created_at", { ascending: false });
    throwOnError("list campaigns", error);
    return (data as CampaignRow[]).map(toCampaign);
  }
  return readLocal<Campaign>(CAMPAIGNS_KEY)
    .filter((row) => (row.founderAddress || "").toLowerCase() === founderAddress.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateCampaign(id: string, updates: Partial<Campaign>) {
  const existing = await getCampaign(id);
  if (!existing) return undefined;
  const next = { ...existing, ...updates };
  await saveCampaign(next);
  return next;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export function buildTask(
  input: Omit<CampaignTask, "id" | "createdAt">
): CampaignTask {
  return { ...input, id: generateId("ctask"), createdAt: new Date().toISOString() };
}

export async function saveTask(task: CampaignTask) {
  if (shouldUseSupabase() && supabase) {
    const { error } = await supabase.from("campaign_tasks").upsert(toTaskRow(task));
    throwOnError("save task", error);
    return task;
  }
  const rows = readLocal<CampaignTask>(CAMPAIGN_TASKS_KEY).filter((row) => row.id !== task.id);
  writeLocal(CAMPAIGN_TASKS_KEY, [...rows, task]);
  return task;
}

export async function deleteTask(id: string) {
  if (shouldUseSupabase() && supabase) {
    const { error } = await supabase.from("campaign_tasks").delete().eq("id", id);
    throwOnError("delete task", error);
    return;
  }
  writeLocal(
    CAMPAIGN_TASKS_KEY,
    readLocal<CampaignTask>(CAMPAIGN_TASKS_KEY).filter((row) => row.id !== id)
  );
}

export async function listTasks(campaignId: string): Promise<CampaignTask[]> {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase
      .from("campaign_tasks")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    throwOnError("list tasks", error);
    return (data as TaskRow[]).map(toTask);
  }
  return readLocal<CampaignTask>(CAMPAIGN_TASKS_KEY)
    .filter((row) => row.campaignId === campaignId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateTask(id: string, updates: Partial<CampaignTask>) {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase.from("campaign_tasks").select("*").eq("id", id).maybeSingle();
    throwOnError("load task", error);
    if (!data) return undefined;
    const next = { ...toTask(data as TaskRow), ...updates };
    await saveTask(next);
    return next;
  }
  const rows = readLocal<CampaignTask>(CAMPAIGN_TASKS_KEY);
  const existing = rows.find((row) => row.id === id);
  if (!existing) return undefined;
  const next = { ...existing, ...updates };
  writeLocal(CAMPAIGN_TASKS_KEY, rows.map((row) => (row.id === id ? next : row)));
  return next;
}

// ─── Submissions ───────────────────────────────────────────────────────────

export function buildSubmission(
  input: Omit<CampaignSubmission, "id" | "status" | "createdAt">
): CampaignSubmission {
  return { ...input, id: generateId("csub"), status: "pending", createdAt: new Date().toISOString() };
}

export async function saveSubmission(submission: CampaignSubmission) {
  if (shouldUseSupabase() && supabase) {
    const { error } = await supabase.from("campaign_submissions").upsert(toSubmissionRow(submission));
    throwOnError("save submission", error);
    return submission;
  }
  const rows = readLocal<CampaignSubmission>(CAMPAIGN_SUBMISSIONS_KEY).filter((row) => row.id !== submission.id);
  writeLocal(CAMPAIGN_SUBMISSIONS_KEY, [...rows, submission]);
  return submission;
}

export async function listSubmissions(campaignId: string): Promise<CampaignSubmission[]> {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase
      .from("campaign_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    throwOnError("list submissions", error);
    return (data as SubmissionRow[]).map(toSubmission);
  }
  return readLocal<CampaignSubmission>(CAMPAIGN_SUBMISSIONS_KEY)
    .filter((row) => row.campaignId === campaignId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateSubmission(id: string, updates: Partial<CampaignSubmission>) {
  if (shouldUseSupabase() && supabase) {
    const { data, error } = await supabase.from("campaign_submissions").select("*").eq("id", id).maybeSingle();
    throwOnError("load submission", error);
    if (!data) return undefined;
    const next = { ...toSubmission(data as SubmissionRow), ...updates };
    await saveSubmission(next);
    return next;
  }
  const rows = readLocal<CampaignSubmission>(CAMPAIGN_SUBMISSIONS_KEY);
  const existing = rows.find((row) => row.id === id);
  if (!existing) return undefined;
  const next = { ...existing, ...updates };
  writeLocal(CAMPAIGN_SUBMISSIONS_KEY, rows.map((row) => (row.id === id ? next : row)));
  return next;
}
