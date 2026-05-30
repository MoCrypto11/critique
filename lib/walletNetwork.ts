import { ARC_CHAIN_ID, ARC_EXPLORER_URL, ARC_RPC_URL } from "./arc";

type SwitchChain = (input: { chainId: number }) => Promise<unknown> | void;

type EthereumProvider = {
  request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getWalletErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybe = error as { code?: unknown; error?: unknown; cause?: unknown };
  if (typeof maybe.code === "number") return maybe.code;
  return getWalletErrorCode(maybe.error) ?? getWalletErrorCode(maybe.cause);
}

export function getWalletErrorMessage(error: unknown, fallback = "Wallet request failed.") {
  if (!error || typeof error !== "object") return fallback;
  const maybe = error as { code?: number; message?: string; shortMessage?: string; details?: string };
  if (getWalletErrorCode(error) === 4001 || maybe.message?.toLowerCase().includes("rejected")) {
    return "Transaction cancelled.";
  }
  const raw = [maybe.shortMessage, maybe.details, maybe.message].filter(Boolean).join(" ").toLowerCase();
  if (raw.includes("current chain") || raw.includes("chain of the wallet") || raw.includes("wrong network")) {
    return "Switch to Arc Testnet to continue.";
  }
  if (raw.includes("insufficient") || raw.includes("exceeds the balance") || raw.includes("not enough")) {
    return "Not enough USDC to fund this bounty.";
  }
  if (raw.includes("contract") && raw.includes("configured")) {
    return "Contract address is not configured.";
  }
  return maybe.shortMessage || maybe.details || maybe.message || fallback;
}

export async function switchToArcTestnet(switchChain: SwitchChain) {
  try {
    await switchChain({ chainId: ARC_CHAIN_ID });
    return;
  } catch (error) {
    if (getWalletErrorCode(error) !== 4902) {
      throw error;
    }

    const provider =
      typeof window !== "undefined"
        ? (window as unknown as { ethereum?: EthereumProvider }).ethereum
        : undefined;
    if (!provider) throw error;

    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
            chainName: "Arc Testnet",
            rpcUrls: [ARC_RPC_URL],
            blockExplorerUrls: [ARC_EXPLORER_URL],
            nativeCurrency: {
              name: "USDC",
              symbol: "USDC",
              decimals: 6
            }
          }
        ]
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${ARC_CHAIN_ID.toString(16)}` }]
      });
    } catch (fallbackError) {
      throw fallbackError;
    }
  }
}
