import { FeedbackSubmission } from "@/lib/storage";
import { getFeedbackTypeLabel } from "@/lib/feedbackRewards";
import { BountyStatusBadge } from "./BountyStatusBadge";
import { TxHashLink } from "./TxHashLink";

function decisionText(submission: FeedbackSubmission) {
  if (submission.decision) {
    return `${submission.decision}${submission.decisionReason ? ` - ${submission.decisionReason}` : ""}`;
  }
  return submission.signupAnswer || "";
}

function mainSummary(submission: FeedbackSubmission) {
  if (submission.feedbackType === "video_walkthrough") return submission.videoSummary || "Video walkthrough submitted";
  if (submission.feedbackType === "technical_proposal") return submission.technicalProblem || submission.suggestedFix || "Technical proposal submitted";
  return submission.firstImpression || submission.understoodAnswer || submission.confusionAnswer || submission.confusedAnswer || "Written feedback submitted";
}

function detailRows(submission: FeedbackSubmission) {
  if (submission.feedbackType === "video_walkthrough") {
    return [
      ["Video summary", submission.videoSummary],
      ["Biggest issue", submission.biggestIssue],
      ["Best suggested improvement", submission.videoImprovement],
      ["Decision", decisionText(submission)]
    ];
  }

  if (submission.feedbackType === "technical_proposal") {
    return [
      ["Contributor background", submission.contributorBackground],
      ["Problem", submission.technicalProblem],
      ["Why it matters", submission.technicalWhy],
      ["Suggested fix", submission.suggestedFix],
      ["Expected impact", submission.expectedImpact],
      ["Estimated difficulty", submission.estimatedDifficulty]
    ];
  }

  return [
    ["Tester context", submission.testerContext || "Legacy submission"],
    ["First impression", submission.firstImpression || submission.understoodAnswer],
    ["What they tried first", submission.firstAction],
    ["Confusion or friction", submission.confusionAnswer || submission.confusedAnswer],
    ["Value clarity", submission.valueClarity || submission.understoodAnswer],
    ["Trust and hesitation", submission.hesitation],
    ["Decision", decisionText(submission)],
    ["Best improvement", submission.bestImprovement]
  ];
}

function submissionLink(submission: FeedbackSubmission) {
  if (submission.feedbackType === "video_walkthrough" && submission.videoLink) {
    return { label: "Video link", href: submission.videoLink };
  }
  if (submission.feedbackType === "technical_proposal" && submission.referenceLink) {
    return { label: "Reference link", href: submission.referenceLink };
  }
  if (submission.proofLink) return { label: "Proof link", href: submission.proofLink };
  return undefined;
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="surface-soft p-4">
      <h3 className="font-black text-ink">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap leading-6 text-muted">{value || "Not collected"}</p>
    </div>
  );
}

export function SubmissionCard({
  submission,
  onApprove,
  onReject,
  rewardLabel,
  busy
}: {
  submission: FeedbackSubmission;
  onApprove?: () => void;
  onReject?: () => void;
  rewardLabel?: string;
  busy?: boolean;
}) {
  const link = submissionLink(submission);
  const decision = decisionText(submission);
  const rows = detailRows(submission);

  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-action/25 bg-action/10 px-3 py-1 text-xs font-black text-action">
              {getFeedbackTypeLabel(submission.feedbackType)}
            </span>
            <BountyStatusBadge status={submission.status} />
          </div>
          <p className="mt-3 break-all text-sm font-black text-ink">{submission.testerWallet}</p>
          {rewardLabel ? <p className="mt-1 text-sm font-bold text-action">{rewardLabel}</p> : null}
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {new Date(submission.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm">
        <div className="surface-soft border-action/20 bg-action/10 p-4">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-action">Main summary</h3>
          <p className="mt-2 whitespace-pre-wrap text-base font-bold leading-7 text-ink">{mainSummary(submission)}</p>
          {decision ? <p className="mt-2 text-sm font-semibold leading-6 text-action">Decision: {decision}</p> : null}
        </div>

        {link ? (
          <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex font-bold text-action underline">
            {link.label}
          </a>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map(([label, value]) => (
            <DetailItem key={label} label={label || "Detail"} value={value} />
          ))}
        </div>

        {submission.rejectionReason ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-700">
            Rejected: {submission.rejectionReason}
          </p>
        ) : null}
        {submission.payoutTxHash ? (
          <p className="rounded-lg border border-action/20 bg-action/10 p-3 font-semibold text-action">
            Receipt: <TxHashLink hash={submission.payoutTxHash} />
          </p>
        ) : null}
      </div>

      {submission.status === "pending" && onApprove && onReject ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="btn-primary"
          >
            {busy ? "Approving..." : "Approve and Pay"}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="btn-secondary"
          >
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}
