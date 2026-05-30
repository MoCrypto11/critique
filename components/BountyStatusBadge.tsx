import { BountyMetadata, FeedbackSubmission } from "@/lib/storage";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  open: "border-action/25 bg-action/10 text-action",
  pending: "border-accent/25 bg-accent/10 text-accent",
  approved: "border-action/25 bg-action/10 text-action",
  rejected: "border-red-200 bg-red-50 text-red-700",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
  expired: "border-slate-200 bg-slate-100 text-slate-700",
  full: "border-slate-200 bg-slate-100 text-slate-700",
  draft: "border-slate-200 bg-slate-100 text-slate-700"
};

export function BountyStatusBadge({ status }: { status: BountyMetadata["status"] | FeedbackSubmission["status"] | "full" }) {
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize", styles[status])}>
      {status}
    </span>
  );
}
