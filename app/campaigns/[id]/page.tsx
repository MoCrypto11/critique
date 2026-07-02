"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { createCampaignSubmissionHash, ENABLE_CAMPAIGNS } from "@/lib/campaigns";
import {
  buildSubmission,
  Campaign,
  CampaignTask,
  getCampaign,
  listTasks,
  saveSubmission
} from "@/lib/campaignStorage";
import { formatUSDC } from "@/lib/feedbackRewards";
import { looksLikeAddress } from "@/lib/utils";

export default function PublicCampaignPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign>();
  const [tasks, setTasks] = useState<CampaignTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [wallet, setWallet] = useState("");
  const [content, setContent] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextCampaign, nextTasks] = await Promise.all([getCampaign(params.id), listTasks(params.id)]);
        if (cancelled) return;
        setCampaign(nextCampaign);
        setTasks(nextTasks.filter((task) => task.status === "active"));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the campaign.");
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);
  const expired = campaign ? new Date(campaign.deadline).getTime() <= Date.now() : false;
  const acceptingSubmissions = Boolean(campaign && campaign.status === "open" && !expired);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!campaign || !selectedTask) return setError("Pick a feedback task first.");
    if (!looksLikeAddress(wallet)) return setError("Enter a valid payout wallet address (0x...).");
    if (content.trim().length < 40) return setError("Write your feedback in more detail (at least a few sentences).");
    if (campaign.requireProof && !proofUrl.trim()) return setError("This campaign requires a proof link.");

    setIsSubmitting(true);
    try {
      const submission = buildSubmission({
        campaignId: campaign.id,
        taskId: selectedTask.id,
        contributorWallet: wallet,
        content: content.trim(),
        proofUrl: proofUrl.trim() || undefined,
        submissionHash: "0x"
      });
      submission.submissionHash = createCampaignSubmissionHash({
        campaignId: campaign.id,
        taskId: selectedTask.id,
        contributorWallet: wallet,
        content: content.trim(),
        proofUrl: proofUrl.trim() || undefined,
        submissionId: submission.id
      });
      await saveSubmission(submission);
      setMessage("Feedback submitted. The founder reviews submissions and approved feedback is paid in USDC.");
      setContent("");
      setProofUrl("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
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

  if (isLoaded && !campaign) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState title="Campaign not found" body="Check the link or ask the founder for a fresh one." />
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {!isLoaded || !campaign ? (
          <EmptyState title="Loading campaign" body="Fetching the campaign brief and tasks." />
        ) : (
          <>
            <section className="surface p-5 sm:p-7">
              <p className="eyebrow">Feedback campaign · Arc testnet escrow</p>
              <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">{campaign.title}</h1>
              {campaign.productUrl ? (
                <a href={campaign.productUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm font-bold text-action underline-offset-4 hover:underline">
                  {campaign.productUrl}
                </a>
              ) : null}
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{campaign.goal}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Budget</p>
                  <p className="mt-1.5 text-base font-black text-action">{formatUSDC(campaign.totalBudgetUSDC)} USDC</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Max per task</p>
                  <p className="mt-1.5 text-base font-black text-ink">{formatUSDC(campaign.maxRewardPerTaskUSDC)} USDC</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Deadline</p>
                  <p className="mt-1.5 text-sm font-black text-ink">{new Date(campaign.deadline).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Status</p>
                  <p className="mt-1.5 text-sm font-black capitalize text-ink">{expired ? "expired" : campaign.status}</p>
                </div>
              </div>
            </section>

            {campaign.acceptanceCriteria.length ? (
              <section className="surface-soft mt-5 rounded-xl p-5">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Accepted feedback must</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
                  {campaign.acceptanceCriteria.map((criterion, index) => (
                    <li key={index}>{criterion}</li>
                  ))}
                </ul>
                {campaign.spamRules ? <p className="mt-3 text-xs leading-5 text-muted">{campaign.spamRules}</p> : null}
              </section>
            ) : null}

            <section className="mt-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-ink">Open feedback tasks</h2>
              {tasks.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`focus-ring rounded-xl border p-4 text-left transition-colors ${
                        selectedTaskId === task.id
                          ? "border-action/50 bg-action/10"
                          : "border-white/10 bg-white/[0.03] hover:border-action/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-black text-ink">{task.title}</span>
                        <span className="shrink-0 rounded-full border border-action/25 bg-action/10 px-2.5 py-0.5 text-[11px] font-black text-action">
                          {formatUSDC(task.rewardUSDC)} USDC
                        </span>
                      </div>
                      {task.expectedDeliverable ? (
                        <p className="mt-2 text-xs leading-5 text-muted">{task.expectedDeliverable}</p>
                      ) : null}
                      {task.criteria.length ? (
                        <ul className="mt-2 list-disc pl-4 text-[11px] leading-5 text-muted">
                          {task.criteria.slice(0, 4).map((criterion, index) => (
                            <li key={index}>{criterion}</li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-sm text-muted">
                  No published tasks yet — check back soon.
                </p>
              )}
            </section>

            <section className="surface mt-6 p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-action">Submit feedback</h2>
              {!acceptingSubmissions ? (
                <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
                  This campaign is {expired ? "past its deadline" : campaign.status} and is not accepting submissions.
                </p>
              ) : (
                <form onSubmit={onSubmit} className="mt-4 space-y-4">
                  {message ? <div className="notice border-action/20 bg-action/10 font-semibold text-action">{message}</div> : null}
                  {error ? <div className="notice border-red-400/30 bg-red-500/10 font-semibold text-red-200">{error}</div> : null}
                  <div>
                    <label className="label">Selected task</label>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {selectedTask ? `${selectedTask.title} — ${formatUSDC(selectedTask.rewardUSDC)} USDC` : "Pick a task above"}
                    </p>
                  </div>
                  <div>
                    <label className="label">Payout wallet address</label>
                    <input className="field" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x..." required />
                    <p className="mt-1 text-xs text-muted">No wallet connection needed — approved rewards are paid to this address in USDC.</p>
                  </div>
                  <div>
                    <label className="label">Your feedback</label>
                    <textarea
                      className="field writing-field min-h-[180px] leading-7"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Follow the task criteria: name the page/step you tested, list specific issues, and suggest a fix."
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Proof link {campaign.requireProof ? "(required)" : "(optional)"}</label>
                    <input className="field" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https:// screenshot or recording" />
                  </div>
                  <button type="submit" disabled={isSubmitting || !selectedTask} className="btn-primary">
                    {isSubmitting ? "Submitting..." : "Submit feedback"}
                  </button>
                </form>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
