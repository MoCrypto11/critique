import { FeedbackSubmission } from "@/lib/storage";
import { TxHashLink } from "./TxHashLink";

const feedbackTypeLabels: Record<NonNullable<FeedbackSubmission["feedbackType"]>, string> = {
  quick_written: "Quick written feedback",
  deep_product_review: "Deep product review",
  video_walkthrough: "Video walkthrough",
  technical_proposal: "Technical proposal"
};

function feedbackTypeLabel(submission: FeedbackSubmission) {
  return submission.feedbackType ? feedbackTypeLabels[submission.feedbackType] : "Written feedback";
}

export function ReceiptCard({ submission, amount }: { submission: FeedbackSubmission; amount: string }) {
  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 pb-4">
        <div>
          <p className="break-all text-sm font-black text-ink">{submission.testerWallet}</p>
          <p className="mt-2 text-sm font-semibold text-action">{amount} testnet USDC paid</p>
        </div>
        <span className="rounded-full border border-action/25 bg-action/10 px-3 py-1 text-xs font-black capitalize text-action">
          {submission.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-muted">
        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
          <span className="font-bold text-ink">Feedback type</span>
          <span className="font-semibold text-ink">{feedbackTypeLabel(submission)}</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
          <span className="font-bold text-ink">Transaction</span>
          <TxHashLink hash={submission.payoutTxHash} />
        </div>
        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
          <span className="font-bold text-ink">Submission hash</span>
          <span className="break-all text-ink">{submission.submissionHash}</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
          <span className="font-bold text-ink">Date</span>
          <span>{new Date(submission.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
