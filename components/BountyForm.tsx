"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { decodeEventLog, getAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { CRITIQUE_DROP_CONTRACT, ENABLE_MOCK_MODE, critiqueDropBountyAbi } from "@/lib/contracts";
import { FeedbackTypeIcon } from "./FeedbackTypeIcon";
import {
  FeedbackRewardConfig,
  defaultFeedbackRewards,
  feedbackTypeOptions,
  formatUSDC,
  getFeedbackTypeContractId,
  getMaxRewardUSDC,
  getTargetRewardTotalUSDC,
  getTotalRewardSlots,
  normalizeRewardAmount
} from "@/lib/feedbackRewards";
import { buildLocalBounty, saveLocalBounty, SharedDatabaseSaveError } from "@/lib/storage";
import { parseUSDC, USDC_ADDRESS, usdcAbi } from "@/lib/usdc";
import { isValidUrl } from "@/lib/utils";
import { getWalletErrorMessage, switchToArcTestnet } from "@/lib/walletNetwork";
import { MockModeBanner } from "./MockModeBanner";

export function BountyForm() {
  const router = useRouter();
  const { address, isConnected, chainId: accountChainId } = useAccount();
  const connectedChainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackRewards, setFeedbackRewards] = useState<FeedbackRewardConfig[]>(defaultFeedbackRewards);

  const contractConfigured = Boolean(CRITIQUE_DROP_CONTRACT);
  const walletConnected = Boolean(address) || isConnected;
  const chainId = accountChainId ?? connectedChainId;
  const isArcTestnet = chainId === ARC_CHAIN_ID;
  const wrongNetwork = walletConnected && !isArcTestnet;
  const mockOnlyMode = ENABLE_MOCK_MODE && !contractConfigured;
  const canCreateBounty = mockOnlyMode || (walletConnected && isArcTestnet && contractConfigured && !ENABLE_MOCK_MODE);
  const selectedRewards = feedbackRewards.filter(
    (reward) => normalizeRewardAmount(reward.rewardUSDC) > 0 && reward.slots > 0
  );
  const fundingSummary = useMemo(() => {
    const maxReward = getMaxRewardUSDC(selectedRewards);
    const slots = getTotalRewardSlots(selectedRewards);
    const targetTotal = getTargetRewardTotalUSDC(selectedRewards);

    return {
      reward: maxReward > 0 ? `${formatUSDC(maxReward)} testnet USDC` : "Not set",
      slots: slots > 0 ? String(slots) : "Not set",
      targetTotal: targetTotal > 0 ? `${formatUSDC(targetTotal)} testnet USDC` : "Not set",
      total: targetTotal > 0 ? `${formatUSDC(targetTotal)} testnet USDC` : "Not set"
    };
  }, [selectedRewards]);

  function updateFeedbackReward(type: FeedbackRewardConfig["feedbackType"], updates: Partial<FeedbackRewardConfig>) {
    setFeedbackRewards((current) =>
      current.map((reward) => (reward.feedbackType === type ? { ...reward, ...updates } : reward))
    );
  }

  function setFeedbackTypeEnabled(type: FeedbackRewardConfig["feedbackType"], enabled: boolean) {
    setFeedbackRewards((current) => {
      const existing = current.find((reward) => reward.feedbackType === type);
      if (!enabled) return current.filter((reward) => reward.feedbackType !== type);
      if (existing) return current;
      const option = feedbackTypeOptions.find((item) => item.value === type);
      return [
        ...current,
        {
          feedbackType: type,
          rewardUSDC: option?.exampleRewardUSDC || "1",
          slots: option?.exampleSlots || 1
        }
      ];
    });
  }

  async function onSwitchNetwork() {
    setError("");
    setErrorDetail("");
    setStatus("");
    try {
      await switchToArcTestnet(switchChainAsync);
    } catch (caught) {
      setError(getWalletErrorMessage(caught, "Switch to Arc Testnet to continue."));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorDetail("");
    setStatus("");

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const productUrl = String(form.get("productUrl") || "").trim();
    const instructions = String(form.get("instructions") || "").trim();
    const deadline = String(form.get("deadline") || "");
    const selectedFeedbackRewards = feedbackRewards
      .filter((reward) => normalizeRewardAmount(reward.rewardUSDC) > 0 && reward.slots > 0)
      .map((reward) => ({
        feedbackType: reward.feedbackType,
        rewardUSDC: formatUSDC(reward.rewardUSDC),
        slots: reward.slots,
        label: feedbackTypeOptions.find((option) => option.value === reward.feedbackType)?.label,
        description: feedbackTypeOptions.find((option) => option.value === reward.feedbackType)?.description,
        enabled: true
      }));
    const maxReward = getMaxRewardUSDC(selectedFeedbackRewards);
    const maxSubmissions = getTotalRewardSlots(selectedFeedbackRewards);
    const rewardUSDC = formatUSDC(maxReward);
    const parsedRewardAmounts = selectedFeedbackRewards.map((reward) => parseUSDC(reward.rewardUSDC));
    const slotCounts = selectedFeedbackRewards.map((reward) => BigInt(reward.slots));
    const feedbackTypeIds = selectedFeedbackRewards.map((reward) => getFeedbackTypeContractId(reward.feedbackType));
    const totalFundAmount = selectedFeedbackRewards.reduce(
      (total, reward) => total + parseUSDC(reward.rewardUSDC) * BigInt(reward.slots),
      BigInt(0)
    );

    if (!title) return setError("Title is required.");
    if (!isValidUrl(productUrl)) return setError("Product URL must be a valid http or https URL.");
    if (!selectedFeedbackRewards.length) return setError("Select at least one feedback type.");
    if (maxReward <= 0) return setError("Each selected feedback type needs a reward greater than 0.");
    if (!Number.isInteger(maxSubmissions) || maxSubmissions < 1) return setError("Each selected feedback type needs at least one slot.");
    if (parsedRewardAmounts.some((amount) => amount <= BigInt(0))) {
      return setError("Each selected feedback type needs a reward greater than 0.");
    }
    if (slotCounts.some((slots) => slots <= BigInt(0))) {
      return setError("Each selected feedback type needs at least one slot.");
    }
    if (
      feedbackTypeIds.length !== parsedRewardAmounts.length ||
      parsedRewardAmounts.length !== slotCounts.length ||
      totalFundAmount <= BigInt(0)
    ) {
      return setError("Funding configuration is invalid. Check selected feedback types, rewards, and slots.");
    }
    if (!deadline || new Date(deadline).getTime() <= Date.now()) return setError("Deadline must be in the future.");
    if (contractConfigured && !walletConnected) return setError("Connect wallet before creating an on-chain bounty.");
    if (contractConfigured && wrongNetwork) {
      return setError("Switch to Arc Testnet to continue.");
    }
    if (!contractConfigured && !ENABLE_MOCK_MODE) return setError("Contract address is not configured.");

    setIsSubmitting(true);

    try {
      const initialBounty = buildLocalBounty({
        founderAddress: address,
        title,
        productUrl,
        instructions,
        rewardUSDC,
        feedbackRewards: selectedFeedbackRewards,
        maxSubmissions,
        deadline: new Date(deadline).toISOString()
      });
      let bounty = initialBounty;
      const txHashes: string[] = [];
      let approvalConfirmed = false;

      if (contractConfigured) {
        if (!walletConnected || !address) {
          throw new Error("Connect wallet before creating an on-chain bounty.");
        }
        if (wrongNetwork) {
          throw new Error("Switch to Arc Testnet to continue.");
        }
        if (!walletClient || !publicClient) {
          throw new Error("Wallet client is not ready. Reconnect your wallet and try again.");
        }
        if (!USDC_ADDRESS) {
          throw new Error("USDC address is not configured.");
        }

        const deadlineSeconds = BigInt(Math.floor(new Date(deadline).getTime() / 1000));
        const contractAddress = getAddress(CRITIQUE_DROP_CONTRACT);
        const usdcAddress = getAddress(USDC_ADDRESS);

        const balance = await publicClient.readContract({
          address: usdcAddress,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [address]
        });
        if (balance < totalFundAmount) {
          throw new Error("Not enough testnet USDC to fund this bounty.");
        }

        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: usdcAbi,
          functionName: "allowance",
          args: [address, contractAddress]
        });

        const createArgs = [feedbackTypeIds, parsedRewardAmounts, slotCounts, deadlineSeconds, `local://${bounty.id}`] as const;

        if (allowance < totalFundAmount) {
          setStatus("Approving exact testnet USDC funding...");
          const approveHash = await walletClient.writeContract({
            address: usdcAddress,
            abi: usdcAbi,
            functionName: "approve",
            args: [contractAddress, totalFundAmount],
            account: address
          });
          txHashes.push(approveHash);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          approvalConfirmed = true;

          const nextAllowance = await publicClient.readContract({
            address: usdcAddress,
            abi: usdcAbi,
            functionName: "allowance",
            args: [address, contractAddress]
          });
          if (nextAllowance < totalFundAmount) {
            throw new Error("USDC approval confirmed, but allowance is still below the funding amount.");
          }
        }

        setStatus("Checking create/fund transaction...");
        try {
          await publicClient.simulateContract({
            address: contractAddress,
            abi: critiqueDropBountyAbi,
            functionName: "createAndFundBounty",
            args: createArgs,
            account: address
          });
        } catch (simulationError) {
          console.error("[Critique create bounty simulation]", simulationError);
          if (approvalConfirmed) {
            throw new Error(
              `USDC approval succeeded, but bounty creation failed. No bounty was saved. You can retry the create/fund transaction. Existing USDC allowance may remain, so you may not need to approve again. Reason: ${getWalletErrorMessage(
                simulationError,
                "Check reward amounts, slots, and funding total."
              )}`
            );
          }
          throw new Error(`Bounty creation check failed: ${getWalletErrorMessage(simulationError, "Check reward amounts, slots, and funding total.")}`);
        }

        setStatus("Creating and funding bounty...");
        let createHash: `0x${string}`;
        try {
          createHash = await walletClient.writeContract({
            address: contractAddress,
            abi: critiqueDropBountyAbi,
            functionName: "createAndFundBounty",
            args: createArgs,
            account: address
          });
        } catch (createError) {
          console.error("[Critique create/fund bounty]", createError);
          throw new Error(
            `USDC approval succeeded, but bounty creation failed. No bounty was saved. You can retry the create/fund transaction. Existing USDC allowance may remain, so you may not need to approve again. Reason: ${getWalletErrorMessage(
              createError,
              "The create/fund transaction was rejected or reverted."
            )}`
          );
        }
        txHashes.push(createHash);
        const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
        if (createReceipt.status !== "success") {
          throw new Error(
            "USDC approval succeeded, but bounty creation failed. No bounty was saved. You can retry the create/fund transaction. Existing USDC allowance may remain, so you may not need to approve again."
          );
        }
        const createdLog = createReceipt.logs
          .map((log) => {
            try {
              return decodeEventLog({ abi: critiqueDropBountyAbi, data: log.data, topics: log.topics });
            } catch {
              return null;
            }
          })
          .find((log) => log?.eventName === "BountyCreated");
        const contractBountyId = createdLog?.args.bountyId?.toString();
        if (!contractBountyId) {
          console.error("[Critique create bounty] missing BountyCreated event", createReceipt);
          throw new Error(
            "Bounty was created, but the app could not resolve the new bounty ID from the transaction receipt. No bounty was saved. Contact support with the transaction hash."
          );
        }
        bounty = {
          ...bounty,
          contractBountyId,
          feedbackRewards: selectedFeedbackRewards,
          txHashes
        };
      }

      bounty = { ...bounty, txHashes };
      await saveLocalBounty(bounty);
      router.push(`/bounty/${bounty.id}`);
    } catch (caught) {
      console.error("[Critique create bounty]", caught);
      const safeMessage = caught instanceof Error ? caught.message : "Unknown error.";
      const isSharedDatabaseError =
        caught instanceof SharedDatabaseSaveError ||
        /shared database|row-level security|permission denied|relation .*does not exist|failed to fetch/i.test(safeMessage);

      if (isSharedDatabaseError) {
        setError("Could not save bounty to shared database.");
        setErrorDetail(
          `Reason: ${
            caught instanceof SharedDatabaseSaveError
              ? caught.reason
              : safeMessage || "Shared database save failed, so this bounty link will not work across browsers."
          }`
        );
      } else {
        setError(getWalletErrorMessage(caught, "Could not create bounty."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-6 p-5 sm:p-7">
      {!contractConfigured && ENABLE_MOCK_MODE ? (
        <MockModeBanner />
      ) : null}
      {!USDC_ADDRESS ? (
        <div className="notice border-accent/25 bg-accent/10 font-semibold text-accent">
          USDC not configured. Set NEXT_PUBLIC_USDC_ADDRESS to the Arc Testnet USDC ERC-20 address.
        </div>
      ) : null}
      {error && !(wrongNetwork && error === "Switch to Arc Testnet to continue.") ? (
        <div className="notice border-red-200 bg-red-50 font-semibold text-red-700">
          <p>{error}</p>
          {errorDetail ? <p className="mt-2 text-xs leading-5 text-red-600">{errorDetail}</p> : null}
          {error === "Could not save bounty to shared database." ? (
            <p className="mt-2 text-xs leading-5 text-red-600">
              Shared database save failed, so this bounty link will not work across browsers.
            </p>
          ) : null}
        </div>
      ) : null}
      {status ? <div className="notice border-action/20 bg-action/10 font-semibold text-action">{status}</div> : null}
      {contractConfigured && !walletConnected ? (
        <div className="notice border-accent/25 bg-accent/10 font-semibold text-accent">
          Connect wallet before creating an on-chain bounty.
        </div>
      ) : null}
      {contractConfigured && wrongNetwork ? (
        <div className="notice flex flex-col gap-3 border-line/80 bg-panel/70 font-semibold text-muted shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-ink">Switch to Arc Testnet to create and fund this bounty.</span>
          <button
            type="button"
            onClick={onSwitchNetwork}
            disabled={isSwitching}
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-action/25 bg-white px-4 py-2 text-sm font-bold text-action shadow-sm transition-colors hover:border-action/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSwitching ? "Switching..." : "Switch network"}
          </button>
        </div>
      ) : null}
      {!contractConfigured && !ENABLE_MOCK_MODE ? (
        <div className="notice border-red-200 bg-red-50 font-semibold text-red-700">Contract address is not configured.</div>
      ) : null}
      {contractConfigured && walletConnected && isArcTestnet && !ENABLE_MOCK_MODE ? (
        <div className="notice border-action/20 bg-action/10 font-semibold text-action">
          Ready to create on-chain bounty.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          <label className="label">
            Bounty title
            <input name="title" className="field" placeholder="Test my onboarding flow" required />
          </label>
          <label className="label">
            Product URL
            <input name="productUrl" type="url" className="field" placeholder="https://example.com" required />
          </label>
          <label className="label">
            Feedback instructions
            <textarea
              name="instructions"
              rows={5}
              className="field resize-y leading-6"
              placeholder="Tell contributors what to try, how long to spend, and what kind of feedback helps."
              required
            />
          </label>
          <section className="surface-soft p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-black text-ink">Accepted feedback types</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Choose the contribution formats you want and set reward amounts for each one.
                </p>
              </div>
              <span className="w-fit self-start rounded-full border border-action/15 bg-action/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-action sm:mt-0.5">
                Reward tiers
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {feedbackTypeOptions.map((option) => {
                const config = feedbackRewards.find((reward) => reward.feedbackType === option.value);
                const enabled = Boolean(config);

                return (
                  <div key={option.value} className="rounded-xl border border-line/70 bg-white p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_130px_110px] lg:items-end">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(event) => setFeedbackTypeEnabled(option.value, event.currentTarget.checked)}
                          className="mt-1 size-4 accent-[#116149]"
                        />
                        <span
                          className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border ${
                            enabled
                              ? "border-action/25 bg-action/10 text-action"
                              : "border-line/80 bg-panel/70 text-muted"
                          }`}
                        >
                          <FeedbackTypeIcon type={option.value} />
                        </span>
                        <span>
                          <span className="block text-sm font-black text-ink">{option.label}</span>
                          <span className="mt-1 block text-sm leading-5 text-muted">{option.description}</span>
                        </span>
                      </label>
                      <label className="label">
                        Reward
                        <input
                          inputMode="decimal"
                          value={config?.rewardUSDC || ""}
                          disabled={!enabled}
                          onChange={(event) => updateFeedbackReward(option.value, { rewardUSDC: event.currentTarget.value })}
                          className="field mt-1.5 py-2.5 disabled:cursor-not-allowed disabled:bg-panel disabled:opacity-60"
                          placeholder={option.exampleRewardUSDC}
                        />
                      </label>
                      <label className="label">
                        Slots
                        <input
                          type="number"
                          min="1"
                          value={config?.slots || ""}
                          disabled={!enabled}
                          onChange={(event) =>
                            updateFeedbackReward(option.value, { slots: Number(event.currentTarget.value) })
                          }
                          className="field mt-1.5 py-2.5 disabled:cursor-not-allowed disabled:bg-panel disabled:opacity-60"
                          placeholder={String(option.exampleSlots)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-1">
            <label className="label">
              Deadline date/time
              <input name="deadline" type="datetime-local" className="field" required />
            </label>
          </div>
        </div>

        <aside className="surface-soft p-5 text-sm leading-6 text-muted lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-action">Funding summary</p>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <dt>Max reward per approval</dt>
              <dd className="font-black text-ink">{fundingSummary.reward}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Total accepted slots</dt>
              <dd className="font-black text-ink">{fundingSummary.slots}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Configured reward total</dt>
              <dd className="font-black text-ink">{fundingSummary.targetTotal}</dd>
            </div>
            <div className="border-t border-line/70 pt-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-bold text-ink">Total funding needed</dt>
                <dd className="font-black text-action">{fundingSummary.total}</dd>
              </div>
            </div>
          </dl>
          <div className="mt-4 space-y-2 rounded-lg border border-line/70 bg-white p-3">
            {selectedRewards.length ? (
              selectedRewards.map((reward) => {
                const option = feedbackTypeOptions.find((item) => item.value === reward.feedbackType);
                return (
                  <div key={reward.feedbackType} className="flex items-center justify-between gap-3">
                    <span>{option?.shortLabel || option?.label}</span>
                    <span className="font-black text-ink">
                      {formatUSDC(reward.rewardUSDC)} x {reward.slots}
                    </span>
                  </div>
                );
              })
            ) : (
              <p>Select at least one feedback type.</p>
            )}
          </div>
          <p className="mt-4 rounded-lg border border-line/70 bg-white p-3">
            Feedback is stored off-chain, while the contract handles funding and payout state.
          </p>
          <p className="mt-3 rounded-lg border border-action/15 bg-action/10 p-3 font-semibold text-action">
            Create and fund once. Approved submissions are paid according to the selected feedback format.
          </p>
        </aside>
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !canCreateBounty}
        className="btn-primary w-full sm:w-auto"
      >
        {isSubmitting ? "Creating..." : contractConfigured ? "Create and Fund with Testnet USDC" : "Create Feedback Bounty"}
      </button>
    </form>
  );
}
