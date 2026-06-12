import { BountyMetadata, FeedbackSubmission } from "@/lib/storage";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  open: "border-action/25 bg-action/10 text-action",
  pending: "border-accent/30 bg-accent/10 text-accent",
  approved: "border-action/25 bg-action/10 text-action",
  rejected: "border-red-400/30 bg-red-500/10 text-red-300",
  closed: "border-white/15 bg-white/5 text-muted",
  expired: "border-white/15 bg-white/5 text-muted",
  full: "border-white/15 bg-white/5 text-muted",
  draft: "border-white/15 bg-white/5 text-muted"
};

export function BountyStatusBadge({ status }: { status: BountyMetadata["status"] | FeedbackSubmission["status"] | "full" }) {
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize", styles[status])}>
      {status}
    </span>
  );
}
