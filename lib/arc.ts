import { defineChain } from "viem";

export const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://testnet.arcscan.app";
export const ARC_FAUCET_URL = "https://faucet.circle.com";

export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL]
    }
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: ARC_EXPLORER_URL
    }
  },
  testnet: true
});
