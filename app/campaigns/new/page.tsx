"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getAddress, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  CRITIQUE_CAMPAIGN_CONTRACT,
  DEFAULT_DISPUTE_WINDOW_SECONDS,
  ENABLE_CAMPAIGNS,
  critiqueCampaignEscrowAbi
} from "@/lib/campaigns";
import {
  buildCampaign,
  buildTask,
  Campaign,
  CampaignApprovalMode,
  listCampaignsByFounder,
  saveCampaign,
  saveTask
} from "@/lib/campaignStorage";
import { formatUSDC } from "@/lib/feedbackRewards";
import { parseUSDC, USDC_ADDRESS, usdcAbi } from "@/lib/usdc";
import { looksLikeAddress } from "@/lib/utils";

type DraftTask = {
  key: string;
  title: string;
  category: string;
  reward: string;
  maxPayouts: number;
  criteria: string[];
  requiredProof: string[];
  expectedDeliverable: string;
  aiReason?: string;
  creatorType: "founder" | "ai";
};

const DEFAULT_CRITERIA = [
  "Name the exact page or step you tested",
  "Include at least 2 specific issues",
  "Include one screenshot or recording/proof link",
  "Include one suggested fix",
  "No generic praise-only feedback",
  "No copied or duplicate responses",
  "Must be relevant to the campaign goal"
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [title, setTitle] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("10");
  const [maxReward, setMaxReward] = useState("2");
  const [deadline, setDeadline] = useState("");
  const [approvalMode, setApprovalMode] = useState<CampaignApprovalMode>("founder");
  const [agentAddress, setAgentAddress] = useState("");
  const [disputeHours, setDisputeHours] = useState("24");
  const [criteriaText, setCriteriaText] = useState(DEFAULT_CRITERIA.join("\n"));
  const [spamRules, setSpamRules] = useState("Duplicate, praise-only, or off-topic feedback is rejected without payout.");
  const [requireProof, setRequireProof] = useState(true);
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!address) {
      setMyCampaigns([]);
      return;
    }
    listCampaignsByFounder(address)
      .then(setMyCampaigns)
      .catch(() => setMyCampaigns([]));
  }, [address]);

  if (!ENABLE_CAMPAIGNS) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState
            title="Campaigns are not enabled"
            body="Feedback campaigns are behind the NEXT_PUBLIC_ENABLE_CAMPAIGNS flag on this deployment."
          />
        </main>
      </>
    );
  }

  async function generatePlan() {
    setError("");
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai/task-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          goal,
          productUrl,
          totalBudgetUSDC: budget,
          maxRewardPerTaskUSDC: maxReward,
          deadline,
          acceptanceCriteria: criteriaText.split("\n").map((line) => line.trim()).filter(Boolean),
          requireProof
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate a task plan.");
      const tasks = (data.tasks || []) as Array<Omit<DraftTask, "key" | "maxPayouts" | "creatorType">>;
      setDrafts((current) => [
        ...current,
        ...tasks.map((task, index) => ({
          key: `ai-${Date.now()}-${index}`,
          title: task.title,
          category: task.category || "feedback",
          reward: task.reward,
          maxPayouts: 1,
          criteria: task.criteria || [],
          requiredProof: task.requiredProof || [],
          expectedDeliverable: task.expectedDeliverable || "",
          aiReason: (task as { reason?: string }).reason,
          creatorType: "ai" as const
        }))
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate a task plan.");
    } finally {
      setAiBusy(false);
    }
  }

  function addManualTask() {
    setDrafts((current) => [
      ...current,
      {
        key: `manual-${Date.now()}`,
        title: "New feedback task",
        category: "feedback",
        reward: "1",
        maxPayouts: 1,
        criteria: [],
        requiredProof: requireProof ? ["Screenshot or recording link"] : [],
        expectedDeliverable: "Structured written feedback",
        creatorType: "founder" as const
      }
    ]);
  }

  function updateDraft(key: string, updates: Partial<DraftTask>) {
    setDrafts((current) => current.map((task) => (task.key === key ? { ...task, ...updates } : task)));
  }

  function removeDraft(key: string) {
    setDrafts((current) => current.filter((task) => task.key !== key));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!title.trim() || !goal.trim()) return setError("Add a campaign title and goal.");
    if (!deadline) return setError("Pick a campaign deadline.");
    const deadlineDate = new Date(deadline);
    if (deadlineDate.getTime() <= Date.now()) return setError("The deadline must be in the future.");
    const budgetUnits = parseUSDC(budget);
    const maxRewardUnits = parseUSDC(maxReward);
    if (budgetUnits <= BigInt(0) || maxRewardUnits <= BigInt(0)) return setError("Budget and max reward must be positive USDC amounts.");
    if (maxRewardUnits > budgetUnits) return setError("Max reward per task cannot exceed the total budget.");
    for (const draft of drafts) {
      if (parseUSDC(draft.reward) <= BigInt(0)) return setError(`Task "${draft.title}" needs a positive reward.`);
      if (parseUSDC(draft.reward) > maxRewardUnits) {
        return setError(`Task "${draft.title}" exceeds the max reward per task.`);
      }
    }
    const agentMode = approvalMode === "agent_queued";
    if (agentMode && !looksLikeAddress(agentAddress)) {
      return setError("Agent-managed mode needs a valid allowed agent wallet address.");
    }
    if (!isConnected || !address) return setError("Connect your founder wallet first.");

    const disputeWindowSeconds = agentMode
      ? Math.max(0, Math.round(Number(disputeHours || "24") * 3600))
      : DEFAULT_DISPUTE_WINDOW_SECONDS;

    setIsSubmitting(true);
    try {
      let campaign = buildCampaign({
        founderAddress: address,
        allowedAgentAddress: agentMode ? agentAddress : undefined,
        title: title.trim(),
        productUrl: productUrl.trim(),
        goal: goal.trim(),
        acceptanceCriteria: criteriaText.split("\n").map((line) => line.trim()).filter(Boolean),
        spamRules: spamRules.trim() || undefined,
        totalBudgetUSDC: budget,
        maxRewardPerTaskUSDC: maxReward,
        deadline: deadlineDate.toISOString(),
        approvalMode,
        autoPayEnabled: agentMode,
        disputeWindowSeconds,
        requireProof
      });

      if (CRITIQUE_CAMPAIGN_CONTRACT) {
        if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
        if (!USDC_ADDRESS) throw new Error("USDC address is not configured.");
        const escrow = getAddress(CRITIQUE_CAMPAIGN_CONTRACT);
        const usdc = getAddress(USDC_ADDRESS);

        const allowance = await publicClient.readContract({
          address: usdc,
          abi: usdcAbi,
          functionName: "allowance",
          args: [address, escrow]
        });
        if (allowance < budgetUnits) {
          setStatus("Approving exact USDC funding...");
          const approveHash = await walletClient.writeContract({
            address: usdc,
            abi: usdcAbi,
            functionName: "approve",
            args: [escrow, budgetUnits],
            account: address
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setStatus("Creating and funding the campaign escrow...");
        const txHash = await walletClient.writeContract({
          address: escrow,
          abi: critiqueCampaignEscrowAbi,
          functionName: "createCampaign",
          args: [
            agentMode ? getAddress(agentAddress) : "0x0000000000000000000000000000000000000000",
            budgetUnits,
            maxRewardUnits,
            BigInt(Math.floor(deadlineDate.getTime() / 1000)),
            BigInt(disputeWindowSeconds),
            agentMode,
            `local://${campaign.id}`,
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          ],
          account: address
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("Campaign creation transaction reverted.");
        const created = parseEventLogs({
          abi: critiqueCampaignEscrowAbi,
          logs: receipt.logs,
          eventName: "CampaignCreated"
        })[0];
        if (!created) throw new Error("Could not resolve the campaign id from the transaction receipt.");
        campaign = { ...campaign, chainCampaignId: created.args.campaignId.toString(), txHash };
      } else {
        setStatus("No campaign contract configured — saving in local mode.");
      }

      await saveCampaign(campaign);
      for (const draft of drafts) {
        await saveTask(
          buildTask({
            campaignId: campaign.id,
            title: draft.title,
            category: draft.category,
            rewardUSDC: draft.reward,
            maxPayouts: draft.maxPayouts,
            criteria: draft.criteria,
            requiredProof: draft.requiredProof,
            expectedDeliverable: draft.expectedDeliverable || undefined,
            aiReason: draft.aiReason,
            creatorType: draft.creatorType,
            status: "draft"
          })
        );
      }

      router.push(`/campaigns/${campaign.id}/dashboard`);
    } catch (caught) {
      console.error("[Critique create campaign]", caught);
      setError(caught instanceof Error ? caught.message : "Could not create the campaign.");
    } finally {
      setIsSubmitting(false);
      setStatus("");
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Feedback campaigns · Arc testnet</p>
          <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Create a feedback campaign</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Fund a USDC campaign escrow, publish feedback tasks, and pay contributors for approved critique.
            The agent operates the workflow. The contract protects the money.
          </p>
        </div>

        {myCampaigns.length ? (
          <section className="surface mb-8 p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">Your campaigns</h2>
            <div className="mt-3 space-y-2">
              {myCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-black text-ink">{campaign.title}</span>
                  <span className="text-xs font-bold text-muted">{formatUSDC(campaign.totalBudgetUSDC)} USDC · {campaign.status}</span>
                  <Link href={`/campaigns/${campaign.id}/dashboard`} className="focus-ring rounded-md border border-action/40 bg-action/15 px-2.5 py-1 text-[11px] font-black text-action hover:bg-action/25">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {error ? <div className="notice mb-5 border-red-400/30 bg-red-500/10 font-semibold text-red-200">{error}</div> : null}
        {status ? <div className="notice mb-5 border-action/20 bg-action/10 font-semibold text-action">{status}</div> : null}

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-6">
            <section className="surface space-y-4 p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Campaign brief</h2>
              <div>
                <label className="label">Campaign title</label>
                <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Onboarding feedback sprint" required />
              </div>
              <div>
                <label className="label">Product URL</label>
                <input className="field" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="label">Campaign goal</label>
                <textarea className="field min-h-[90px]" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Spend up to 20 USDC this week collecting feedback on my onboarding flow." required />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Total budget (USDC)</label>
                  <input className="field" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" required />
                </div>
                <div>
                  <label className="label">Max reward per task</label>
                  <input className="field" value={maxReward} onChange={(e) => setMaxReward(e.target.value)} inputMode="decimal" required />
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input className="field" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
                </div>
              </div>
            </section>

            <section className="surface space-y-4 p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Acceptance criteria &amp; spam rules</h2>
              <div>
                <label className="label">Acceptance criteria (one per line)</label>
                <textarea className="field min-h-[130px]" value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} />
              </div>
              <div>
                <label className="label">Spam prevention rules</label>
                <textarea className="field min-h-[60px]" value={spamRules} onChange={(e) => setSpamRules(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink">
                <input type="checkbox" checked={requireProof} onChange={(e) => setRequireProof(e.target.checked)} />
                Require a proof link (screenshot / recording) on submissions
              </label>
            </section>

            <section className="surface space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Feedback tasks</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={addManualTask} className="btn-secondary px-3 py-2 text-xs">
                    Add task
                  </button>
                  <button type="button" onClick={generatePlan} disabled={aiBusy || !goal.trim()} className="btn-primary px-3 py-2 text-xs">
                    {aiBusy ? "Drafting plan..." : "AI: suggest task plan"}
                  </button>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted">
                AI suggestions are drafts — edit rewards and criteria, delete what you don&rsquo;t want, and publish
                tasks from the campaign dashboard after funding.
              </p>
              {drafts.length ? (
                <div className="space-y-3">
                  {drafts.map((task) => (
                    <div key={task.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_auto] sm:items-end">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Title</label>
                          <input className="field mt-1 py-2" value={task.title} onChange={(e) => updateDraft(task.key, { title: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Reward</label>
                          <input className="field mt-1 py-2" value={task.reward} inputMode="decimal" onChange={(e) => updateDraft(task.key, { reward: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Slots</label>
                          <input
                            className="field mt-1 py-2"
                            value={task.maxPayouts}
                            inputMode="numeric"
                            onChange={(e) => updateDraft(task.key, { maxPayouts: Math.max(1, Number(e.target.value) || 1) })}
                          />
                        </div>
                        <button type="button" onClick={() => removeDraft(task.key)} className="btn-secondary px-3 py-2 text-xs">
                          Delete
                        </button>
                      </div>
                      {task.aiReason ? <p className="mt-2 text-xs leading-5 text-muted">AI: {task.aiReason}</p> : null}
                      {task.criteria.length ? (
                        <ul className="mt-2 list-disc pl-5 text-xs leading-5 text-muted">
                          {task.criteria.map((criterion, index) => (
                            <li key={index}>{criterion}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-muted">
                  No tasks yet. Use the AI Campaign Builder or add tasks manually — you can also add tasks later.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <section className="surface space-y-4 p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Payout mode</h2>
              <div>
                <label className="label">Approval mode</label>
                <select className="field" value={approvalMode} onChange={(e) => setApprovalMode(e.target.value as CampaignApprovalMode)}>
                  <option value="founder">Founder approval (recommended)</option>
                  <option value="agent_queued">Agent-managed queued payout (experimental)</option>
                </select>
              </div>
              {approvalMode === "agent_queued" ? (
                <>
                  <div>
                    <label className="label">Allowed AI agent address</label>
                    <input className="field" value={agentAddress} onChange={(e) => setAgentAddress(e.target.value)} placeholder="0x..." />
                  </div>
                  <div>
                    <label className="label">Dispute / cancel window (hours)</label>
                    <input className="field" value={disputeHours} onChange={(e) => setDisputeHours(e.target.value)} inputMode="decimal" />
                  </div>
                </>
              ) : null}
              <p className="rounded-lg border border-action/15 bg-action/10 p-3 text-xs leading-5 text-action">
                AI can recommend or queue payouts, but campaign limits are enforced by the smart contract.
                The agent cannot withdraw campaign funds or exceed your payout limits.
              </p>
            </section>

            <section className="surface p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Funding</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Creating the campaign funds <span className="font-black text-ink">{formatUSDC(budget)} USDC</span> into the
                campaign escrow contract on Arc testnet. Unused funds can be refunded after the deadline or close.
              </p>
              {!CRITIQUE_CAMPAIGN_CONTRACT ? (
                <p className="mt-3 rounded-lg border border-accent/25 bg-accent/10 p-3 text-xs leading-5 text-accent">
                  No campaign contract is configured — the campaign will be saved in local mode without onchain escrow.
                </p>
              ) : null}
              <button type="submit" disabled={isSubmitting} className="btn-primary mt-4 w-full">
                {isSubmitting ? "Creating campaign..." : "Create & fund campaign"}
              </button>
            </section>
          </aside>
        </form>
      </main>
    </>
  );
}
