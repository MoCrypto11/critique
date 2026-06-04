"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AppHeader } from "@/components/AppHeader";
import { BountyStatusBadge } from "@/components/BountyStatusBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmptyState } from "@/components/EmptyState";
import {
  FeedbackType,
  feedbackTypeOptions,
  formatUSDC,
  getFeedbackTypeLabel,
  getRewardForType,
  normalizeFeedbackRewards
} from "@/lib/feedbackRewards";
import {
  addSubmission,
  BountyMetadata,
  FeedbackSubmission,
  getDemoBounty,
  getLocalBounty,
  listSubmissions
} from "@/lib/storage";
import { looksLikeAddress } from "@/lib/utils";

function deriveStatus(bounty: BountyMetadata, submissions: FeedbackSubmission[]) {
  if (bounty.status === "closed") return "closed";
  if (new Date(bounty.deadline).getTime() <= Date.now()) return "expired";
  if (submissions.filter((submission) => submission.status !== "rejected").length >= bounty.maxSubmissions) return "full";
  return "open";
}

type Decision = NonNullable<FeedbackSubmission["decision"]>;
type Difficulty = NonNullable<FeedbackSubmission["estimatedDifficulty"]>;

const decisionOptions: Decision[] = ["Yes", "Maybe", "No"];
const difficultyOptions: Difficulty[] = ["Low", "Medium", "High"];

export default function PublicBountyPage({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const [bounty, setBounty] = useState<BountyMetadata | undefined>(() =>
    params.id === "demo" ? getDemoBounty() : undefined
  );
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(params.id === "demo");
  const [publicLink, setPublicLink] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("quick_written");

  useEffect(() => {
    let cancelled = false;

    async function loadBounty() {
      try {
        const [nextBounty, nextSubmissions] = await Promise.all([getLocalBounty(params.id), listSubmissions(params.id)]);
        if (cancelled) return;
        setBounty(nextBounty);
        setSubmissions(nextSubmissions);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load bounty.");
        }
      } finally {
        if (!cancelled) {
          setPublicLink(`${window.location.origin}/bounty/${params.id}`);
          setIsLoaded(true);
        }
      }
    }

    void loadBounty();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const status = useMemo(() => (bounty ? deriveStatus(bounty, submissions) : "open"), [bounty, submissions]);
  const availableRewards = useMemo(
    () => (bounty ? normalizeFeedbackRewards(bounty.feedbackRewards, bounty.rewardUSDC, bounty.maxSubmissions) : []),
    [bounty]
  );
  const selectedReward = getRewardForType(availableRewards, feedbackType);
  const hasVariableRewards = new Set(availableRewards.map((reward) => formatUSDC(reward.rewardUSDC))).size > 1;
  const slotsUsed = submissions.filter((submission) => submission.status !== "rejected").length;
  const slotsLeft = bounty ? Math.max(0, bounty.maxSubmissions - slotsUsed) : 0;
  const deadlineLabel = bounty ? new Date(bounty.deadline).toLocaleString() : "";
  const compactField = "field mt-1.5 py-2.5";
  const compactTextarea = "field mt-1.5 min-h-[68px] resize-y py-2.5 leading-6";
  const formSection = "space-y-3 rounded-xl border border-line/70 bg-panel/45 p-4";
  const isWrittenFeedback = feedbackType === "quick_written" || feedbackType === "deep_product_review";
  const isFounder = Boolean(
    address && bounty?.founderAddress && bounty.founderAddress.toLowerCase() === address.toLowerCase()
  );

  useEffect(() => {
    if (availableRewards.length && !availableRewards.some((reward) => reward.feedbackType === feedbackType)) {
      setFeedbackType(availableRewards[0].feedbackType);
    }
  }, [availableRewards, feedbackType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!bounty) return;
    if (status === "full") return setError("This bounty is full.");
    if (status === "expired") return setError("This bounty has expired.");
    if (status === "closed") return setError("This bounty is closed.");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedFeedbackType = String(form.get("feedbackType") || feedbackType).trim() as FeedbackType;
    if (!availableRewards.some((reward) => reward.feedbackType === selectedFeedbackType)) {
      return setError("Choose one of the accepted feedback types for this bounty.");
    }
    const testerWallet = String(form.get("testerWallet") || "").trim();
    const testerContext = String(form.get("testerContext") || "").trim();
    const firstImpression = String(form.get("firstImpression") || "").trim();
    const firstAction = String(form.get("firstAction") || "").trim();
    const confusionAnswer = String(form.get("confusionAnswer") || "").trim();
    const valueClarity = String(form.get("valueClarity") || "").trim();
    const hesitation = String(form.get("hesitation") || "").trim();
    const decision = String(form.get("decision") || "").trim() as Decision;
    const decisionReason = String(form.get("decisionReason") || "").trim();
    const bestImprovement = String(form.get("bestImprovement") || "").trim();
    const proofLink = String(form.get("proofLink") || "").trim();
    const videoLink = String(form.get("videoLink") || "").trim();
    const videoSummary = String(form.get("videoSummary") || "").trim();
    const biggestIssue = String(form.get("biggestIssue") || "").trim();
    const videoImprovement = String(form.get("videoImprovement") || "").trim();
    const contributorBackground = String(form.get("contributorBackground") || "").trim();
    const technicalProblem = String(form.get("technicalProblem") || "").trim();
    const technicalWhy = String(form.get("technicalWhy") || "").trim();
    const suggestedFix = String(form.get("suggestedFix") || "").trim();
    const expectedImpact = String(form.get("expectedImpact") || "").trim();
    const estimatedDifficulty = String(form.get("estimatedDifficulty") || "").trim() as Difficulty;
    const referenceLink = String(form.get("referenceLink") || "").trim();

    if (!looksLikeAddress(testerWallet)) return setError("Tester wallet should look like an EVM address.");

    if (selectedFeedbackType === "quick_written" || selectedFeedbackType === "deep_product_review") {
      if (
        !testerContext ||
        !firstImpression ||
        !firstAction ||
        !confusionAnswer ||
        !valueClarity ||
        !hesitation ||
        !decision ||
        !decisionReason ||
        !bestImprovement
      ) {
        return setError("Please complete each written feedback question.");
      }
    }

    if (selectedFeedbackType === "video_walkthrough") {
      if (!videoLink || !videoSummary || !biggestIssue || !videoImprovement || !decision || !decisionReason) {
        return setError("Please complete each video walkthrough field.");
      }
    }

    if (selectedFeedbackType === "technical_proposal") {
      if (
        !contributorBackground ||
        !technicalProblem ||
        !technicalWhy ||
        !suggestedFix ||
        !expectedImpact ||
        !estimatedDifficulty
      ) {
        return setError("Please complete each technical proposal field.");
      }
    }

    if (submissions.some((submission) => submission.testerWallet.toLowerCase() === testerWallet.toLowerCase())) {
      return setError("This wallet already submitted feedback for this bounty.");
    }

    try {
      await addSubmission({
        bountyId: bounty.id,
        testerWallet,
        feedbackType: selectedFeedbackType,
        testerContext: testerContext || undefined,
        firstImpression: firstImpression || undefined,
        firstAction: firstAction || undefined,
        confusionAnswer: confusionAnswer || undefined,
        valueClarity: valueClarity || undefined,
        hesitation: hesitation || undefined,
        decision: decision || undefined,
        decisionReason: decisionReason || undefined,
        bestImprovement: bestImprovement || undefined,
        proofLink: proofLink || undefined,
        videoLink: videoLink || undefined,
        videoSummary: videoSummary || undefined,
        biggestIssue: biggestIssue || undefined,
        videoImprovement: videoImprovement || undefined,
        contributorBackground: contributorBackground || undefined,
        technicalProblem: technicalProblem || undefined,
        technicalWhy: technicalWhy || undefined,
        suggestedFix: suggestedFix || undefined,
        expectedImpact: expectedImpact || undefined,
        estimatedDifficulty: estimatedDifficulty || undefined,
        referenceLink: referenceLink || undefined
      });
      setSubmissions(await listSubmissions(bounty.id));
      formElement.reset();
      setMessage("Feedback submitted. Approved submissions receive the configured Arc testnet reward.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit feedback.");
    }
  }

  if (!isLoaded) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState title="Loading bounty" body="Preparing the public feedback link." />
        </main>
      </>
    );
  }

  if (!bounty) {
    return (
      <>
        <AppHeader />
        <main className="page-shell">
          <EmptyState title="Bounty not found" body="Create a bounty or try the example bounty." />
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Public bounty</p>
            <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">{bounty.title}</h1>
            <p className="mt-3 text-base font-semibold text-action">
              {hasVariableRewards
                ? "Founder-set rewards by feedback type"
                : `${formatUSDC(bounty.rewardUSDC)} testnet USDC per approved response`}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <BountyStatusBadge status={status} />
            {publicLink ? <CopyLinkButton href={publicLink} /> : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_450px] lg:items-start">
          <div className="space-y-4 lg:self-start">
            <section className="surface p-5 sm:p-6">
              <div className="grid gap-5 text-sm">
                <div className="flex flex-col gap-3 border-b border-line/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-ink">Product to review</h2>
                    <p className="mt-1 break-all text-muted">{bounty.productUrl}</p>
                  </div>
                  <a
                    href={bounty.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full sm:w-auto"
                  >
                    Open product
                  </a>
                </div>
                <div>
                  <h2 className="text-lg font-black text-ink">Feedback instructions</h2>
                  <p className="mt-3 whitespace-pre-wrap rounded-xl border border-line/70 bg-panel/70 p-4 leading-7 text-muted">
                    {bounty.instructions}
                  </p>
                </div>
                <div className="surface-soft p-4 text-sm leading-6 text-muted">
                  <p className="font-black text-ink">How approval works</p>
                  <p className="mt-1">
                    Submit feedback from the wallet you want paid. The founder approves useful responses for the
                    configured Arc testnet reward.
                  </p>
                </div>
                {isFounder ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href={`/bounty/${bounty.id}/review`} className="btn-secondary">
                      Review submissions
                    </Link>
                    <Link href={`/bounty/${bounty.id}/dashboard`} className="btn-secondary">
                      View dashboard
                    </Link>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="surface p-4 lg:sticky lg:top-24">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Reward</p>
                  <p className="mt-1 font-black text-ink">Up to {formatUSDC(bounty.rewardUSDC)} testnet USDC</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Slots left</p>
                  <p className="mt-1 font-black text-ink">{slotsLeft}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Deadline</p>
                  <p className="mt-1 font-black leading-5 text-ink">{deadlineLabel}</p>
                </div>
              </div>
              <p className="mt-3 rounded-lg border border-action/15 bg-action/10 p-3 text-sm font-semibold leading-5 text-action">
                Useful feedback is more likely to be approved.
              </p>
            </aside>
          </div>

          <form onSubmit={onSubmit} className="surface space-y-4 p-4 sm:p-5 lg:self-start">
            <div>
              <h2 className="text-xl font-black text-ink">Submit feedback</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Be direct, specific, and useful.</p>
            </div>
            {error ? <div className="notice border-red-200 bg-red-50 font-semibold text-red-700">{error}</div> : null}
            {message ? <div className="notice border-action/20 bg-action/10 font-semibold text-action">{message}</div> : null}

            <section className={formSection}>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Feedback type</h3>
                <p className="mt-1 text-sm leading-5 text-muted">
                  Choose the format that best matches your contribution. Useful, specific feedback is more likely to be approved.
                </p>
              </div>
              <div className="grid gap-2">
                {availableRewards.map((reward) => {
                  const type = feedbackTypeOptions.find((option) => option.value === reward.feedbackType);
                  if (!type) return null;
                  return (
                  <label
                    key={type.value}
                    className="focus-within:ring-action/40 cursor-pointer rounded-lg border border-line bg-white p-3 transition-colors has-[:checked]:border-action/40 has-[:checked]:bg-action/10 focus-within:ring-2"
                  >
                    <input
                      type="radio"
                      name="feedbackType"
                      value={type.value}
                      checked={feedbackType === type.value}
                      onChange={() => setFeedbackType(type.value)}
                      className="sr-only"
                    />
                    <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="block text-sm font-black text-ink">{type.label}</span>
                      <span className="w-fit rounded-full border border-action/20 bg-action/10 px-2.5 py-1 text-xs font-black text-action">
                        {formatUSDC(reward.rewardUSDC)} testnet USDC
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-muted">{type.description}</span>
                  </label>
                  );
                })}
              </div>
              {selectedReward ? (
                <p className="rounded-lg border border-line/70 bg-white p-3 text-sm font-semibold leading-5 text-muted">
                  Selected format: {getFeedbackTypeLabel(selectedReward.feedbackType)}. Founder-configured reward:{" "}
                  <span className="text-action">{formatUSDC(selectedReward.rewardUSDC)} testnet USDC</span>.
                </p>
              ) : null}
            </section>

            <section className={formSection}>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">
                  {feedbackType === "technical_proposal" ? "Contributor" : "About you"}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted">Add just enough context.</p>
              </div>
              <label className="label">
                Tester wallet address
                <input name="testerWallet" className={compactField} placeholder="0x..." required />
              </label>
              {isWrittenFeedback ? (
                <label className="label">
                  What best describes you?
                  <input
                    name="testerContext"
                    className={compactField}
                    placeholder="Example: founder, developer, designer, crypto user, beginner, potential customer..."
                    required
                  />
                </label>
              ) : null}
              {feedbackType === "technical_proposal" ? (
                <label className="label">
                  Contributor background
                  <input
                    name="contributorBackground"
                    className={compactField}
                    placeholder="Frontend dev, smart contract dev, designer, growth, founder..."
                    required
                  />
                </label>
              ) : null}
            </section>

            {isWrittenFeedback ? (
              <>
                <section className={formSection}>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Product understanding</h3>
                    <p className="mt-1 text-sm leading-5 text-muted">Capture your first read.</p>
                  </div>
                  <label className="label">
                    In one sentence, what do you think this product does?
                    <span className="mt-1 block text-xs font-semibold leading-5 text-muted">Answer after a quick look.</span>
                    <textarea name="firstImpression" rows={2} className={compactTextarea} required />
                  </label>
                  <label className="label">
                    What did you try to do first?
                    <textarea
                      name="firstAction"
                      rows={2}
                      className={compactTextarea}
                      placeholder="Describe the first action you wanted to take."
                      required
                    />
                  </label>
                </section>

                <section className={formSection}>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Friction</h3>
                    <p className="mt-1 text-sm leading-5 text-muted">Name what helped and what slowed you down.</p>
                  </div>
                  <label className="label">
                    Where did you get confused, stuck, or unsure?
                    <textarea
                      name="confusionAnswer"
                      rows={2}
                      className="field mt-1.5 min-h-[84px] resize-y py-2.5 leading-6"
                      placeholder="Mention unclear copy, layout problems, missing info, broken flow, trust issues, etc."
                      required
                    />
                  </label>
                  <label className="label">
                    What part felt useful or valuable?
                    <textarea
                      name="valueClarity"
                      rows={2}
                      className={compactTextarea}
                      placeholder="What made sense? What problem does it solve?"
                      required
                    />
                  </label>
                  <label className="label">
                    What would stop you from using it?
                    <textarea
                      name="hesitation"
                      rows={2}
                      className={compactTextarea}
                      placeholder="Price, trust, unclear benefit, missing proof, confusing UX, wallet concern, etc."
                      required
                    />
                  </label>
                </section>
              </>
            ) : null}

            {feedbackType === "video_walkthrough" ? (
              <section className={formSection}>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Video walkthrough</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">Share a link and the main takeaway.</p>
                </div>
                <label className="label">
                  Video link
                  <input
                    name="videoLink"
                    type="url"
                    className={compactField}
                    placeholder="Loom, YouTube unlisted, Google Drive, or recording link"
                    required
                  />
                </label>
                <label className="label">
                  Short summary of the video
                  <textarea name="videoSummary" rows={2} className={compactTextarea} required />
                </label>
                <label className="label">
                  Biggest issue found
                  <textarea name="biggestIssue" rows={2} className={compactTextarea} required />
                </label>
                <label className="label">
                  Best suggested improvement
                  <textarea name="videoImprovement" rows={2} className={compactTextarea} required />
                </label>
              </section>
            ) : null}

            {feedbackType === "technical_proposal" ? (
              <section className={formSection}>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Technical proposal</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">Frame the problem, fix, and expected impact.</p>
                </div>
                <label className="label">
                  What is the problem?
                  <textarea name="technicalProblem" rows={2} className={compactTextarea} required />
                </label>
                <label className="label">
                  Why does it matter?
                  <textarea name="technicalWhy" rows={2} className={compactTextarea} required />
                </label>
                <label className="label">
                  Suggested fix
                  <textarea name="suggestedFix" rows={2} className="field mt-1.5 min-h-[84px] resize-y py-2.5 leading-6" required />
                </label>
                <label className="label">
                  Expected impact
                  <textarea name="expectedImpact" rows={2} className={compactTextarea} required />
                </label>
                <fieldset className="space-y-2">
                  <legend className="label">Estimated difficulty</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {difficultyOptions.map((option) => (
                      <label
                        key={option}
                        className="focus-within:ring-action/40 flex cursor-pointer items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-sm font-black text-ink has-[:checked]:border-action/40 has-[:checked]:bg-action/10 has-[:checked]:text-action focus-within:ring-2"
                      >
                        <input type="radio" name="estimatedDifficulty" value={option} className="sr-only" required />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="label">
                  Optional reference link
                  <input
                    name="referenceLink"
                    type="url"
                    className={compactField}
                    placeholder="GitHub issue, Figma, Notion, screenshot, demo link..."
                  />
                </label>
              </section>
            ) : null}

            {feedbackType !== "technical_proposal" ? (
            <section className={formSection}>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Final decision</h3>
                <p className="mt-1 text-sm leading-5 text-muted">Give the founder a clear signal.</p>
              </div>
              <fieldset className="space-y-2">
                <legend className="label">Would you use it, sign up, or recommend it?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {decisionOptions.map((option) => (
                    <label
                      key={option}
                      className="focus-within:ring-action/40 flex cursor-pointer items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-sm font-black text-ink has-[:checked]:border-action/40 has-[:checked]:bg-action/10 has-[:checked]:text-action focus-within:ring-2"
                    >
                      <input type="radio" name="decision" value={option} className="sr-only" required />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="label">
                Short reason
                <textarea name="decisionReason" rows={2} className={compactTextarea} required />
              </label>
              {isWrittenFeedback ? (
                <>
                  <label className="label">
                    What is the one change that would improve this product most?
                    <textarea
                      name="bestImprovement"
                      rows={2}
                      className={compactTextarea}
                      placeholder="Give one specific change."
                      required
                    />
                  </label>
                  <label className="label">
                    Optional proof link
                    <input
                      name="proofLink"
                      type="url"
                      className={compactField}
                      placeholder="Screenshot, Loom, GitHub issue, recording, or any URL."
                    />
                  </label>
                </>
              ) : null}
            </section>
            ) : null}

            <div className="border-t border-line/70 bg-white/95 pt-4 lg:sticky lg:bottom-0">
              <button
                type="submit"
                disabled={status !== "open"}
                className="btn-primary w-full"
              >
                Submit Feedback
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
