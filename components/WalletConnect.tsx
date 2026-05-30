"use client";

import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { shortAddress } from "@/lib/utils";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;
  const connector = connectors[0];

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => connector && connect({ connector })}
        disabled={!connector || isPending}
        className="btn-primary min-h-10 px-4 py-2"
      >
        {isPending ? "Connecting..." : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {wrongNetwork ? (
        <button
          type="button"
          onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
          className="focus-ring min-h-10 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-bold text-accent"
        >
          Switch to Arc
        </button>
      ) : null}
      <span className="min-h-10 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm">
        {shortAddress(address)}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="btn-secondary min-h-10 px-3 py-2"
      >
        Disconnect
      </button>
    </div>
  );
}
