"use client";

import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { shortAddress } from "@/lib/utils";
import { getWalletErrorMessage, switchToArcTestnet } from "@/lib/walletNetwork";

export function WalletConnect() {
  const [error, setError] = useState("");
  const { address, isConnected, chainId: accountChainId } = useAccount();
  const connectedChainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const walletConnected = Boolean(address) || isConnected;
  const chainId = accountChainId ?? connectedChainId;
  const wrongNetwork = walletConnected && chainId !== ARC_CHAIN_ID;
  const connector = connectors[0];

  async function onSwitchNetwork() {
    setError("");
    try {
      await switchToArcTestnet(switchChainAsync);
    } catch (caught) {
      setError(getWalletErrorMessage(caught, "Could not switch to Arc Testnet."));
    }
  }

  if (!walletConnected) {
    return (
      <button
        type="button"
        onClick={() => connector && connect({ connector })}
        disabled={!connector || isPending}
        className="btn-primary min-h-11 px-5 py-2"
      >
        {isPending ? "Connecting..." : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm">
          {address ? shortAddress(address) : "Wallet connected"}
        </span>
        {wrongNetwork ? (
          <>
            <span className="inline-flex min-h-11 items-center rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-sm font-bold text-accent">
              Wrong network
            </span>
            <button
              type="button"
              onClick={onSwitchNetwork}
              disabled={isSwitching}
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-action/25 bg-white px-3 py-2 text-sm font-bold text-action shadow-sm transition-colors hover:border-action/40 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSwitching ? "Switching..." : "Switch to Arc"}
            </button>
          </>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-lg border border-action/20 bg-action/10 px-3 py-2 text-sm font-bold text-action">
            Arc Testnet
          </span>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="btn-secondary min-h-11 px-3 py-2"
        >
          Disconnect
        </button>
      </div>
      {error ? <p className="max-w-sm text-xs font-semibold text-muted">{error}</p> : null}
    </div>
  );
}
