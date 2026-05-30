"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { decodeEventLog, getAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { CRITIQUE_DROP_CONTRACT, ENABLE_MOCK_MODE, critiqueDropBountyAbi } from "@/lib/contracts";
import { createLocalBounty, updateLocalBounty, addTxHashToBounty } from "@/lib/storage";
import { parseUSDC, USDC_ADDRESS, usdcAbi } from "@/lib/usdc";
import { isValidUrl } from "@/lib/utils";
import { getWalletErrorMessage, switchToArcTestnet } from "@/lib/walletNetwork";
import { MockModeBanner } from "./MockModeBanner";

const bountyCreatedEvent = {
  type: "event",
  name: "BountyCreated",
  inputs: [
    { indexed: true, name: "bountyId", type: "uint256" },
    { indexed: true, name: "founder", type: "address" },
    { indexed: false, name: "rewardPerSubmission", type: "uint256" },
    { indexed: false, name: "maxSubmissions", type: "uint256" },
    { indexed: false, name: "deadline", type: "uint256" },
    { indexed: false, name: "metadataURI", type: "string" }
  ]
} as const;

export function BountyForm() {
  const router = useRouter();
  const { address, isConnected, chainId: accountChainId } = useAccount();
  const connectedChainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardPreview, setRewardPreview] = useState("");
  const [slotsPreview, setSlotsPreview] = useState("");

  const contractConfigured = Boolean(CRITIQUE_DROP_CONTRACT);
  const walletConnected = Boolean(address) || isConnected;
  const chainId = accountChainId ?? connectedChainId;
  const isArcTestnet = chainId === ARC_CHAIN_ID;
  const wrongNetwork = walletConnected && !isArcTestnet;
  const mockOnlyMode = ENABLE_MOCK_MODE && !contractConfigured;
  const canCreateBounty = mockOnlyMode || (walletConnected && isArcTestnet && contractConfigured && !ENABLE_MOCK_MODE);
  const fundingSummary = useMemo(() => {
    const reward = Number(rewardPreview);
    const slots = Number(slotsPreview);
    const hasReward = Number.isFinite(reward) && reward > 0;
    const hasSlots = Number.isInteger(slots) && slots > 0;
    const total = hasReward && hasSlots ? reward * slots : 0;

    return {
      reward: hasReward ? `${rewardPreview} USDC` : "Not set",
      slots: hasSlots ? String(slots) : "Not set",
      total: total > 0 ? `${Number(total.toFixed(6)).toString()} USDC` : "Not set"
    };
  }, [rewardPreview, slotsPreview]);

  async function onSwitchNetwork() {
    setError("");
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
    setStatus("");

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const productUrl = String(form.get("productUrl") || "").trim();
    const instructions = String(form.get("instructions") || "").trim();
    const rewardUSDC = String(form.get("rewardUSDC") || "").trim();
    const maxSubmissions = Number(form.get("maxSubmissions"));
    const deadline = String(form.get("deadline") || "");
    const reward = Number(rewardUSDC);

    if (!title) return setError("Title is required.");
    if (!isValidUrl(productUrl)) return setError("Product URL must be a valid http or https URL.");
    if (!Number.isFinite(reward) || reward <= 0) return setError("Reward must be greater than 0.");
    if (!Number.isInteger(maxSubmissions) || maxSubmissions < 1) return setError("Slots must be at least 1.");
    if (!deadline || new Date(deadline).getTime() <= Date.now()) return setError("Deadline must be in the future.");
    if (contractConfigured && !walletConnected) return setError("Connect wallet before creating an on-chain bounty.");
    if (contractConfigured && wrongNetwork) {
      return setError("Switch to Arc Testnet to continue.");
    }
    if (!contractConfigured && !ENABLE_MOCK_MODE) return setError("Contract address is not configured.");

    setIsSubmitting(true);

    try {
      const bounty = await createLocalBounty({
        founderAddress: address,
        title,
        productUrl,
        instructions,
        rewardUSDC,
        maxSubmissions,
        deadline: new Date(deadline).toISOString()
      });

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

        const rewardAmount = parseUSDC(rewardUSDC);
        const fundAmount = rewardAmount * BigInt(maxSubmissions);
        const deadlineSeconds = BigInt(Math.floor(new Date(deadline).getTime() / 1000));

        setStatus("Creating bounty on the contract...");
        const createHash = await walletClient.writeContract({
          address: getAddress(CRITIQUE_DROP_CONTRACT),
          abi: critiqueDropBountyAbi,
          functionName: "createBounty",
          args: [rewardAmount, BigInt(maxSubmissions), deadlineSeconds, `local://${bounty.id}`],
          account: address
        });
        await addTxHashToBounty(bounty.id, createHash);
        const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
        const createdLog = createReceipt.logs
          .map((log) => {
            try {
              return decodeEventLog({ abi: [bountyCreatedEvent], data: log.data, topics: log.topics });
            } catch {
              return null;
            }
          })
          .find((log) => log?.eventName === "BountyCreated");
        const contractBountyId = createdLog?.args.bountyId?.toString() || "0";
        await updateLocalBounty(bounty.id, { contractBountyId });

        setStatus("Approving USDC for funding...");
        const approveHash = await walletClient.writeContract({
          address: getAddress(USDC_ADDRESS),
          abi: usdcAbi,
          functionName: "approve",
          args: [getAddress(CRITIQUE_DROP_CONTRACT), fundAmount],
          account: address
        });
        await addTxHashToBounty(bounty.id, approveHash);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        setStatus("Funding bounty with USDC...");
        const fundHash = await walletClient.writeContract({
          address: getAddress(CRITIQUE_DROP_CONTRACT),
          abi: critiqueDropBountyAbi,
          functionName: "fundBounty",
          args: [BigInt(contractBountyId), fundAmount],
          account: address
        });
        await addTxHashToBounty(bounty.id, fundHash);
        await publicClient.waitForTransactionReceipt({ hash: fundHash });
      }

      router.push(`/bounty/${bounty.id}`);
    } catch (caught) {
      setError(getWalletErrorMessage(caught, "Could not create bounty."));
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
        <div className="notice border-red-200 bg-red-50 font-semibold text-red-700">{error}</div>
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
              placeholder="Tell testers what to try, how long to spend, and what kind of feedback helps."
              required
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="label">
              Reward per response in USDC
              <input
                name="rewardUSDC"
                inputMode="decimal"
                className="field"
                placeholder="1"
                onChange={(event) => setRewardPreview(event.currentTarget.value)}
                required
              />
            </label>
            <label className="label">
              Tester slots
              <input
                name="maxSubmissions"
                type="number"
                min="1"
                className="field"
                placeholder="5"
                onChange={(event) => setSlotsPreview(event.currentTarget.value)}
                required
              />
            </label>
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
              <dt>Reward per response</dt>
              <dd className="font-black text-ink">{fundingSummary.reward}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Tester slots</dt>
              <dd className="font-black text-ink">{fundingSummary.slots}</dd>
            </div>
            <div className="border-t border-line/70 pt-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-bold text-ink">Total funding needed</dt>
                <dd className="font-black text-action">{fundingSummary.total}</dd>
              </div>
            </div>
          </dl>
          <p className="mt-4 rounded-lg border border-line/70 bg-white p-3">
            Feedback stays off-chain in local storage for this MVP.
          </p>
        </aside>
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !canCreateBounty}
        className="btn-primary w-full sm:w-auto"
      >
        {isSubmitting ? "Creating..." : contractConfigured ? "Create and Fund with USDC" : "Create Feedback Bounty"}
      </button>
    </form>
  );
}
