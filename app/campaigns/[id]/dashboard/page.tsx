"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { FounderAccess, FounderGate } from "@/components/FounderGate";
import { RejectSubmissionModal } from "@/components/RejectSubmissionModal";
import { TxHashLink } from "@/components/TxHashLink";
import {
  createEvaluationHash,
  CRITIQUE_CAMPAIGN_CONTRACT,
  critiqueCampaignEscrowAbi,
  ENABLE_CAMPAIGNS
} from "@/lib/campaigns";
import {
  Campaign,
  CampaignSubmission,
  CampaignTask,
  getCampaign,
  listSubmissions,
  listTasks,
  updateCampaign,
  updateSubmission,
  updateTask
} from "@/lib/campaignStorage";
import { formatUSDC } from "@/lib/feedbackRewards";
import { formatUSDC as formatUnitsUSDC, parseUSDC } from "@/lib/usdc";
import { isFounderWallet } from "@/lib/utils";

type ChainStats = {
  totalBudget: bigint;
  spent: bigint;
  reserved: bigint;
  paused: boolean;
  closed: boolean;
  autoPayEnabled: boolean;
};

export default function CampaignDashboardPage({ params }: { params: { id: string } }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [campaign, setCampaign] = useState<Campaign>();
  const [tasks, setTasks] = useState<CampaignTask[]>([]);
  const [submissions, setSubmissions] = useState<CampaignSubmission[]>([]);
  const [chainStats, setChainStats] = useState<ChainStats>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rejectTarget, setRejectTarget] = useState<CampaignSubmission>();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const onChain = Boolean(CRITIQUE_CAMPAIGN_CONTRACT && campaign?.chainCampaignId);

  const refresh = useCallback(async () => {
    const nextCampaign = await getCampaign(params.id);
    setCampaign(nextCampaign);
    if (nextCampaign && isFounderWallet(nextCampaign.founderAddress, address)) {
      const [nextTasks, nextSubmissions] = await Promise.all([listTasks(params.id), listSubmissions(params.id)]);
      setTasks(nextTasks);
      setSubmissions(nextSubmissions);
      if (CRITIQUE_CAMPAIGN_CONTRACT && nextCampaign.chainCampaignId && publicClient) {
        try {
          const data = await publicClient.readContract({
            address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
            abi: critiqueCampaignEscrowAbi,
            functionName: "getCampaign",
            args: [BigInt(nextCampaign.chainCampaignId)]
          });
          setChainStats({
            totalBudget: data.totalBudget,
            spent: data.spent,
            reserved: data.reserved,
            paused: data.paused,
            closed: data.closed,
            autoPayEnabled: data.autoPayEnabled
          });
        } catch {
          setChainStats(undefined);
        }
      }
    } else {
      setTasks([]);
      setSubmissions([]);
    }
    setIsLoaded(true);
  }, [params.id, address, publicClient]);

  useEffect(() => {
    void refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load the campaign.");
      setIsLoaded(true);
    });
  }, [refresh]);

  const stats = useMemo(() => {
    if (chainStats) {
      return {
        funded: formatUnitsUSDC(chainStats.totalBudget),
        spent: formatUnitsUSDC(chainStats.spent),
        reserved: formatUnitsUSDC(chainStats.reserved),
        remaining: formatUnitsUSDC(chainStats.totalBudget - chainStats.spent - chainStats.reserved)
      };
    }
    if (!campaign) return { funded: "0", spent: "0", reserved: "0", remaining: "0" };
    const spent = submissions
      .filter((submission) => submission.status === "paid" || submission.status === "approved")
      .reduce((sum, submission) => {
        const task = tasks.find((item) => item.id === submission.taskId);
        return sum + Number(task?.rewardUSDC || 0);
      }, 0);
    const reserved = submissions
      .filter((submission) => submission.status === "queued")
      .reduce((sum, submission) => {
        const task = tasks.find((item) => item.id === submission.taskId);
        return sum + Number(task?.rewardUSDC || 0);
      }, 0);
    const funded = Number(campaign.totalBudgetUSDC);
    return {
      funded: String(funded),
      spent: String(spent),
      reserved: String(reserved),
      remaining: String(Math.max(0, funded - spent - reserved))
    };
  }, [chainStats, campaign, submissions, tasks]);

  async function withChain(action: string, run: () => Promise<void>) {
    setError("");
    setStatus(action);
    try {
      await run();
      await refresh();
    } catch (caught) {
      console.error(`[Critique campaign] ${action}`, caught);
      setError(caught instanceof Error ? caught.message : `Could not ${action.toLowerCase()}`);
    } finally {
      setStatus("");
    }
  }

  function requireChainClients() {
    if (!walletClient || !publicClient) throw new Error("Wallet client is not ready.");
    if (!address) throw new Error("Connect the founder wallet.");
    return { wallet: walletClient, pub: publicClient, founder: address };
  }

  async function publishTask(task: CampaignTask) {
    setBusyId(task.id);
    await withChain("Publishing task...", async () => {
      if (onChain && campaign?.chainCampaignId) {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "createTask",
          args: [
            BigInt(campaign.chainCampaignId),
            parseUSDC(task.rewardUSDC),
            task.maxPayouts,
            true,
            `local://task/${task.id}`,
            createEvaluationHash(JSON.stringify(task.criteria))
          ],
          account: founder
        });
        const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("Task creation reverted.");
        const created = parseEventLogs({ abi: critiqueCampaignEscrowAbi, logs: receipt.logs, eventName: "TaskCreated" })[0];
        await updateTask(task.id, { status: "active", chainTaskId: created?.args.taskId.toString(), txHash });
      } else {
        await updateTask(task.id, { status: "active" });
      }
    });
    setBusyId("");
  }

  async function closeTaskAction(task: CampaignTask) {
    setBusyId(task.id);
    await withChain("Closing task...", async () => {
      if (onChain && task.chainTaskId) {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "closeTask",
          args: [BigInt(task.chainTaskId)],
          account: founder
        });
        await pub.waitForTransactionReceipt({ hash: txHash });
      }
      await updateTask(task.id, { status: "closed" });
    });
    setBusyId("");
  }

  async function evaluateSubmission(submission: CampaignSubmission) {
    const task = tasks.find((item) => item.id === submission.taskId);
    if (!task || !campaign) return;
    setBusyId(submission.id);
    setError("");
    try {
      const response = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignGoal: campaign.goal,
          spamRules: campaign.spamRules,
          approvalMode: campaign.approvalMode,
          task: {
            title: task.title,
            criteria: task.criteria,
            requiredProof: task.requiredProof,
            expectedDeliverable: task.expectedDeliverable
          },
          submission: { content: submission.content, proofUrl: submission.proofUrl },
          otherSubmissionSummaries: submissions
            .filter((item) => item.id !== submission.id && item.taskId === submission.taskId && item.aiSummary)
            .map((item) => item.aiSummary as string)
            .slice(0, 10)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evaluation failed.");
      await updateSubmission(submission.id, {
        aiSummary: data.summary,
        aiQualityScore: data.qualityScore,
        aiCriteriaMatch: data.criteriaMatch,
        aiSpamRisk: data.spamRisk,
        aiDuplicateRisk: data.duplicateRisk,
        aiSuggestedAction: data.suggestedAction,
        aiReason: data.reason,
        evaluationHash: createEvaluationHash(JSON.stringify(data))
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not evaluate the submission.");
    } finally {
      setBusyId("");
    }
  }

  async function approveAndPay(submission: CampaignSubmission) {
    const task = tasks.find((item) => item.id === submission.taskId);
    if (!task || !campaign) return;
    setBusyId(submission.id);
    await withChain("Approving and paying...", async () => {
      let payoutTxHash: string | undefined;
      if (onChain && campaign.chainCampaignId) {
        if (!task.chainTaskId) throw new Error("Publish this task onchain before paying against it.");
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "founderApproveAndPay",
          args: [
            BigInt(campaign.chainCampaignId),
            BigInt(task.chainTaskId),
            getAddress(submission.contributorWallet),
            submission.submissionHash as `0x${string}`,
            (submission.evaluationHash || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
            ""
          ],
          account: founder
        });
        const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("Payout transaction reverted. The submission stays pending.");
        payoutTxHash = txHash;
      }
      await updateSubmission(submission.id, {
        status: "paid",
        payoutTxHash,
        paidAt: new Date().toISOString()
      });
    });
    setBusyId("");
  }

  async function cancelQueued(submission: CampaignSubmission) {
    if (!campaign) return;
    setBusyId(submission.id);
    await withChain("Cancelling queued payout...", async () => {
      if (onChain && campaign.chainCampaignId) {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "founderCancelQueuedPayout",
          args: [BigInt(campaign.chainCampaignId), submission.submissionHash as `0x${string}`],
          account: founder
        });
        await pub.waitForTransactionReceipt({ hash: txHash });
      }
      await updateSubmission(submission.id, { status: "cancelled" });
    });
    setBusyId("");
  }

  async function executeQueued(submission: CampaignSubmission) {
    if (!campaign) return;
    setBusyId(submission.id);
    await withChain("Executing queued payout...", async () => {
      if (onChain && campaign.chainCampaignId) {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "executeQueuedPayout",
          args: [BigInt(campaign.chainCampaignId), submission.submissionHash as `0x${string}`],
          account: founder
        });
        const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("Execution reverted (is the dispute window over?).");
        await updateSubmission(submission.id, { status: "paid", payoutTxHash: txHash, paidAt: new Date().toISOString() });
      } else {
        await updateSubmission(submission.id, { status: "paid", paidAt: new Date().toISOString() });
      }
    });
    setBusyId("");
  }

  async function confirmReject(reason: string) {
    if (!rejectTarget || !campaign) return;
    setIsRejecting(true);
    setRejectError("");
    try {
      if (onChain && campaign.chainCampaignId && rejectTarget.status === "pending") {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "founderRejectSubmission",
          args: [BigInt(campaign.chainCampaignId), rejectTarget.submissionHash as `0x${string}`],
          account: founder
        });
        await pub.waitForTransactionReceipt({ hash: txHash });
      }
      await updateSubmission(rejectTarget.id, { status: "rejected", rejectionReason: reason });
      setRejectTarget(undefined);
      await refresh();
    } catch (caught) {
      setRejectError(caught instanceof Error ? caught.message : "Could not reject the submission.");
    } finally {
      setIsRejecting(false);
    }
  }

  async function setPaused(paused: boolean) {
    if (!campaign) return;
    await withChain(paused ? "Pausing campaign..." : "Resuming campaign...", async () => {
      if (onChain && campaign.chainCampaignId) {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "setCampaignPaused",
          args: [BigInt(campaign.chainCampaignId), paused],
          account: founder
        });
        await pub.waitForTransactionReceipt({ hash: txHash });
      }
      await updateCampaign(campaign.id, { status: paused ? "paused" : "open" });
    });
  }

  async function closeCampaignAction() {
    if (!campaign) return;
    await withChain("Closing campaign...", async () => {
      if (onChain && campaign.chainCampaignId) {
        const { wallet, pub, founder } = requireChainClients();
        const txHash = await wallet.writeContract({
          address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
          abi: critiqueCampaignEscrowAbi,
          functionName: "closeCampaign",
          args: [BigInt(campaign.chainCampaignId)],
          account: founder
        });
        await pub.waitForTransactionReceipt({ hash: txHash });
      }
      await updateCampaign(campaign.id, { status: "closed" });
    });
  }

  async function refundUnused() {
    if (!campaign) return;
    await withChain("Refunding unused budget...", async () => {
      if (!onChain || !campaign.chainCampaignId) throw new Error("Refunds require the onchain campaign escrow.");
      const { wallet, pub, founder } = requireChainClients();
      const txHash = await wallet.writeContract({
        address: getAddress(CRITIQUE_CAMPAIGN_CONTRACT),
        abi: critiqueCampaignEscrowAbi,
        functionName: "refundUnusedBudget",
        args: [BigInt(campaign.chainCampaignId)],
        account: founder
      });
      const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("Refund reverted (available after deadline or close).");
    });
  }

  if (!ENABLE_CAMPAIGNS) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState title="Campaigns are not enabled" body="Feedback campaigns are not enabled on this deployment." />
        </main>
      </>
    );
  }

  const walletConnected = Boolean(address) || isConnected;
  const access: FounderAccess = !isLoaded
    ? "loading"
    : !campaign
      ? "not-found"
      : !walletConnected
        ? "no-wallet"
        : !isFounderWallet(campaign.founderAddress, address)
          ? "not-founder"
          : "authorized";

  if (access !== "authorized" || !campaign) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <FounderGate access={access} bountyId={params.id} publicHref={`/campaigns/${params.id}`} entityLabel="campaign" />
        </main>
      </>
    );
  }

  const pending = submissions.filter((submission) => submission.status === "pending");
  const queued = submissions.filter((submission) => submission.status === "queued");
  const decided = submissions.filter((submission) => !["pending", "queued"].includes(submission.status));
  const agentMode = campaign.approvalMode === "agent_queued";

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Campaign console · Arc testnet</p>
            <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">{campaign.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Mode: <span className="font-black text-ink">{agentMode ? "Agent-managed queued payout (experimental)" : "Founder approval"}</span>
              {" · "}The agent operates the workflow. The contract protects the money.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/campaigns/${campaign.id}`} className="btn-secondary">Public page</Link>
            {campaign.status !== "closed" ? (
              <button type="button" onClick={() => setPaused(campaign.status !== "paused")} className="btn-secondary">
                {campaign.status === "paused" ? "Resume" : "Pause"}
              </button>
            ) : null}
            {campaign.status !== "closed" ? (
              <button type="button" onClick={closeCampaignAction} className="btn-secondary">Close</button>
            ) : null}
            <button type="button" onClick={refundUnused} className="btn-primary">Refund unused</button>
          </div>
        </div>

        {error ? <div className="notice mt-5 border-red-400/30 bg-red-500/10 font-semibold text-red-200">{error}</div> : null}
        {status ? <div className="notice mt-5 border-action/20 bg-action/10 font-semibold text-action">{status}</div> : null}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Funded", stats.funded],
            ["Reserved (queued)", stats.reserved],
            ["Spent", stats.spent],
            ["Remaining", stats.remaining]
          ].map(([label, value]) => (
            <div key={label} className="surface p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1.5 text-xl font-black text-ink">{formatUSDC(value)} USDC</p>
            </div>
          ))}
        </div>

        {agentMode ? (
          <p className="notice mt-4 border-accent/25 bg-accent/10 text-xs font-semibold leading-5 text-accent">
            Experimental: the authorized agent ({campaign.allowedAgentAddress}) can queue payouts that pass your
            criteria. Queued payouts wait {Math.round(campaign.disputeWindowSeconds / 3600)}h before executing — you can
            cancel any of them during that window. The agent cannot withdraw campaign funds or exceed your payout limits.
          </p>
        ) : null}

        <section className="surface mt-6 p-5 sm:p-6">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">Tasks</h2>
          {tasks.length ? (
            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-ink">{task.title}</p>
                    <p className="text-xs text-muted">
                      {formatUSDC(task.rewardUSDC)} USDC · {task.maxPayouts} slot{task.maxPayouts === 1 ? "" : "s"} ·{" "}
                      {task.creatorType === "ai" ? "AI draft" : "founder"} · <span className="capitalize">{task.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {task.status === "draft" ? (
                      <button type="button" disabled={busyId === task.id} onClick={() => publishTask(task)} className="focus-ring rounded-md border border-action/40 bg-action/15 px-2.5 py-1 text-[11px] font-black text-action hover:bg-action/25">
                        {busyId === task.id ? "Publishing..." : "Publish"}
                      </button>
                    ) : null}
                    {task.status === "active" ? (
                      <button type="button" disabled={busyId === task.id} onClick={() => closeTaskAction(task)} className="focus-ring rounded-md border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-ink hover:border-action/40">
                        Close task
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-sm text-muted">No tasks yet — add them from the campaign builder.</p>
          )}
        </section>

        {queued.length ? (
          <section className="surface mt-6 p-5 sm:p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">Queued payouts</h2>
            <div className="mt-3 space-y-2">
              {queued.map((submission) => {
                const task = tasks.find((item) => item.id === submission.taskId);
                const executableAt = submission.queuedAt
                  ? new Date(new Date(submission.queuedAt).getTime() + campaign.disputeWindowSeconds * 1000)
                  : undefined;
                const executable = executableAt ? executableAt.getTime() <= Date.now() : false;
                return (
                  <div key={submission.id} className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-ink">
                        {task?.title || "Task"} → {submission.contributorWallet.slice(0, 6)}…{submission.contributorWallet.slice(-4)}
                        <span className="ml-2 text-action">{task ? `${formatUSDC(task.rewardUSDC)} USDC` : ""}</span>
                      </p>
                      <div className="flex gap-2">
                        <button type="button" disabled={busyId === submission.id} onClick={() => cancelQueued(submission)} className="focus-ring rounded-md border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-300">
                          Cancel
                        </button>
                        <button type="button" disabled={busyId === submission.id || !executable} onClick={() => executeQueued(submission)} className="focus-ring rounded-md border border-action/40 bg-action/15 px-2.5 py-1 text-[11px] font-black text-action disabled:opacity-50">
                          Execute payout
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {executableAt ? (executable ? "Dispute window over — executable now." : `Executable after ${executableAt.toLocaleString()}.`) : "Queued."}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">
            Pending submissions <span className="text-muted">({pending.length})</span>
          </h2>
          <div className="mt-3 space-y-4">
            {pending.length ? (
              pending.map((submission) => {
                const task = tasks.find((item) => item.id === submission.taskId);
                return (
                  <article key={submission.id} className="surface p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-ink">{task?.title || "Task"}</p>
                        <p className="text-xs text-muted">
                          {submission.contributorWallet} · {new Date(submission.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-black text-accent">pending</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-sm leading-6 text-ink">
                      {submission.content}
                    </p>
                    {submission.proofUrl ? (
                      <a href={submission.proofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-action underline">
                        Proof link
                      </a>
                    ) : null}

                    {submission.aiSummary ? (
                      <div className="mt-3 rounded-lg border border-action/15 bg-action/[0.06] p-3 text-xs leading-5">
                        <p className="font-black uppercase tracking-[0.12em] text-action">AI evaluation</p>
                        <p className="mt-1.5 text-ink">{submission.aiSummary}</p>
                        <p className="mt-1.5 text-muted">
                          Quality {submission.aiQualityScore}/100 · criteria match {submission.aiCriteriaMatch} · spam risk{" "}
                          {submission.aiSpamRisk} · duplicate risk {submission.aiDuplicateRisk} · suggests{" "}
                          <span className="font-black text-ink">{submission.aiSuggestedAction}</span>
                        </p>
                        {submission.aiReason ? <p className="mt-1.5 text-muted">{submission.aiReason}</p> : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" disabled={busyId === submission.id} onClick={() => evaluateSubmission(submission)} className="btn-secondary px-3 py-2 text-xs">
                        {busyId === submission.id ? "Working..." : submission.aiSummary ? "Re-run AI evaluation" : "Run AI evaluation"}
                      </button>
                      <button type="button" disabled={busyId === submission.id} onClick={() => approveAndPay(submission)} className="btn-primary px-3 py-2 text-xs">
                        Approve &amp; pay {task ? `${formatUSDC(task.rewardUSDC)} USDC` : ""}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === submission.id}
                        onClick={() => {
                          setRejectError("");
                          setRejectTarget(submission);
                        }}
                        className="btn-secondary px-3 py-2 text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-muted">No pending submissions.</p>
            )}
          </div>
        </section>

        {decided.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">History</h2>
            <div className="mt-3 space-y-2">
              {decided.map((submission) => {
                const task = tasks.find((item) => item.id === submission.taskId);
                return (
                  <div key={submission.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs">
                    <span className="min-w-0 truncate font-bold text-ink">
                      {task?.title || "Task"} · {submission.contributorWallet.slice(0, 6)}…{submission.contributorWallet.slice(-4)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="capitalize font-black text-muted">{submission.status}</span>
                      {submission.payoutTxHash ? <TxHashLink hash={submission.payoutTxHash} /> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
      <RejectSubmissionModal
        open={Boolean(rejectTarget)}
        busy={isRejecting}
        error={rejectError}
        onCancel={() => {
          if (!isRejecting) setRejectTarget(undefined);
        }}
        onConfirm={confirmReject}
      />
    </>
  );
}
