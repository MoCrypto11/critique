import { ARC_CHAIN_ID, ARC_EXPLORER_URL, ARC_RPC_URL } from "./arc";

type SwitchChain = (input: { chainId: number }) => Promise<unknown> | void;

type EthereumProvider = {
  request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function getWalletErrorMessage(error: unknown, fallback = "Wallet request failed.") {
  if (!error || typeof error !== "object") return fallback;
  const maybe = error as { code?: number; message?: string; shortMessage?: string; details?: string };
  if (maybe.code === 4001 || maybe.message?.toLowerCase().includes("rejected")) {
    return "Transaction rejected by user.";
  }
  return maybe.shortMessage || maybe.details || maybe.message || fallback;
}

export async function switchToArcTestnet(switchChain: SwitchChain) {
  try {
    await switchChain({ chainId: ARC_CHAIN_ID });
    return;
  } catch (error) {
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
