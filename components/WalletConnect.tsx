"use client";

import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { shortAddress } from "@/lib/utils";
import { getWalletErrorMessage, switchToArcTestnet } from "@/lib/walletNetwork";

export function WalletConnect() {
  const [error, setError] = useState("");
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;
  const connector = connectors[0];

  async function onSwitchNetwork() {
    setError("");
    try {
      await switchToArcTestnet(switchChainAsync);
    } catch (caught) {
      setError(getWalletErrorMessage(caught, "Could not switch to Arc Testnet."));
    }
  }

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
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {wrongNetwork ? (
          <button
            type="button"
            onClick={onSwitchNetwork}
            disabled={isSwitching}
            className="focus-ring min-h-10 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-bold text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSwitching ? "Switching..." : "Switch to Arc Testnet"}
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
      {error ? <p className="max-w-sm text-xs font-semibold text-accent">{error}</p> : null}
    </div>
  );
}
