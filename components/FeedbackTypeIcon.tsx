import { Code2, FileText, SearchCheck, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeedbackType } from "@/lib/feedbackRewards";

const feedbackTypeIcons: Record<FeedbackType, LucideIcon> = {
  quick_written: FileText,
  deep_product_review: SearchCheck,
  video_walkthrough: Video,
  technical_proposal: Code2
};

export function FeedbackTypeIcon({ type, className = "size-4" }: { type: FeedbackType; className?: string }) {
  const Icon = feedbackTypeIcons[type] || FileText;
  return <Icon aria-hidden="true" className={className} strokeWidth={2} />;
}
