export type FeedbackType = "quick_written" | "deep_product_review" | "video_walkthrough" | "technical_proposal";

export type FeedbackRewardConfig = {
  feedbackType: FeedbackType;
  rewardUSDC: string;
  slots: number;
  contractBountyId?: string;
  label?: string;
  description?: string;
  enabled?: boolean;
};

export const feedbackTypeOptions: {
  value: FeedbackType;
  label: string;
  shortLabel: string;
  description: string;
  exampleRewardUSDC: string;
  exampleSlots: number;
}[] = [
  {
    value: "quick_written",
    label: "Written feedback",
    shortLabel: "Written",
    description: "Structured written feedback on clarity, friction, and value.",
    exampleRewardUSDC: "1",
    exampleSlots: 2
  },
  {
    value: "deep_product_review",
    label: "Deep product review",
    shortLabel: "Deep review",
    description: "A more detailed product review with stronger product-validation context.",
    exampleRewardUSDC: "3",
    exampleSlots: 1
  },
  {
    value: "video_walkthrough",
    label: "Video walkthrough link",
    shortLabel: "Video",
    description: "A recorded walkthrough link with the main issues and recommendations.",
    exampleRewardUSDC: "5",
    exampleSlots: 1
  },
  {
    value: "technical_proposal",
    label: "Technical improvement proposal",
    shortLabel: "Technical",
    description: "A concrete technical or implementation improvement proposal.",
    exampleRewardUSDC: "7",
    exampleSlots: 1
  }
];

export const defaultFeedbackRewards: FeedbackRewardConfig[] = feedbackTypeOptions.map((option) => ({
  feedbackType: option.value,
  rewardUSDC: option.exampleRewardUSDC,
  slots: option.exampleSlots,
  label: option.label,
  description: option.description,
  enabled: true
}));

export function getFeedbackTypeLabel(type?: FeedbackType) {
  return feedbackTypeOptions.find((option) => option.value === type)?.label || "Written feedback";
}

export function normalizeRewardAmount(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function formatUSDC(value: string | number | undefined) {
  const parsed = normalizeRewardAmount(value);
  if (!parsed) return "Not set";
  return Number(parsed.toFixed(6)).toString();
}

export function normalizeFeedbackRewards(
  rewards: unknown,
  fallbackRewardUSDC = "1",
  fallbackSlots = 1
): FeedbackRewardConfig[] {
  if (Array.isArray(rewards) && rewards.length) {
    const normalized = rewards
      .map((item): FeedbackRewardConfig | undefined => {
        const candidate = item as Partial<FeedbackRewardConfig> & {
          id?: FeedbackType;
          rewardAmount?: string | number;
          contract_bounty_id?: string;
        };
        const feedbackType = candidate.feedbackType || candidate.id;
        const option = feedbackTypeOptions.find((item) => item.value === feedbackType);
        const rewardUSDC = String(candidate.rewardUSDC || candidate.rewardAmount || "").trim();
        const slots = Number(candidate.slots);

        if (!option || normalizeRewardAmount(rewardUSDC) <= 0 || !Number.isInteger(slots) || slots < 1) {
          return undefined;
        }

        return {
          feedbackType: option.value,
          rewardUSDC,
          slots,
          contractBountyId: candidate.contractBountyId || candidate.contract_bounty_id,
          label: candidate.label || option.label,
          description: candidate.description || option.description,
          enabled: candidate.enabled !== false
        };
      })
      .filter((item): item is FeedbackRewardConfig => item !== undefined);
    return normalized;
  }

  return feedbackTypeOptions.map((option) => ({
    feedbackType: option.value,
    rewardUSDC: fallbackRewardUSDC,
    slots: fallbackSlots,
    label: option.label,
    description: option.description,
    enabled: true
  }));
}

export function getRewardForType(rewards: FeedbackRewardConfig[] | undefined, type?: FeedbackType) {
  return rewards?.find((reward) => reward.feedbackType === type);
}

export function getMaxRewardUSDC(rewards: FeedbackRewardConfig[]) {
  return rewards
    .filter((reward) => reward.enabled !== false)
    .reduce((max, reward) => Math.max(max, normalizeRewardAmount(reward.rewardUSDC)), 0);
}

export function getTotalRewardSlots(rewards: FeedbackRewardConfig[]) {
  return rewards.filter((reward) => reward.enabled !== false).reduce((total, reward) => total + reward.slots, 0);
}

export function getTargetRewardTotalUSDC(rewards: FeedbackRewardConfig[]) {
  return rewards
    .filter((reward) => reward.enabled !== false)
    .reduce((total, reward) => total + normalizeRewardAmount(reward.rewardUSDC) * reward.slots, 0);
}

export function getSafeContractFundingTotalUSDC(rewards: FeedbackRewardConfig[]) {
  return getTargetRewardTotalUSDC(rewards);
}
