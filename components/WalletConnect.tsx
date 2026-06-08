"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc";
import { copyText, shortAddress } from "@/lib/utils";
import { getWalletErrorMessage, switchToArcTestnet } from "@/lib/walletNetwork";

export function WalletConnect() {
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { address, isConnected, chainId: accountChainId } = useAccount();
  const connectedChainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const walletConnected = Boolean(address) || isConnected;
  const chainId = accountChainId ?? connectedChainId;
  const wrongNetwork = walletConnected && chainId !== ARC_CHAIN_ID;
  const connector = connectors[0];

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  async function onSwitchNetwork() {
    setError("");
    try {
      await switchToArcTestnet(switchChainAsync);
    } catch (caught) {
      setError(getWalletErrorMessage(caught, "Could not switch to Arc Testnet."));
    }
  }

  async function onCopyAddress() {
    if (!address) return;
    await copyText(address);
    setMenuOpen(false);
  }

  function onDisconnect() {
    setMenuOpen(false);
    disconnect();
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

  if (wrongNetwork) {
    return (
      <button
        type="button"
        onClick={onSwitchNetwork}
        disabled={isSwitching}
        title={error || undefined}
        className="focus-ring inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-accent/20 bg-white px-4 py-2 text-sm font-black text-accent shadow-sm transition-colors hover:border-accent/35 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSwitching ? "Switching..." : "Switch to Arc"}
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        className="focus-ring inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-action/20 bg-white px-4 py-2 text-sm font-black text-ink shadow-sm transition-colors hover:border-action/35 hover:bg-panel"
      >
        <span className="size-2 rounded-full bg-action" aria-hidden="true" />
        <span>{address ? shortAddress(address) : "Wallet connected"}</span>
        <span className="hidden text-action sm:inline">· Arc</span>
      </button>

      {menuOpen ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-44 rounded-xl border border-line/70 bg-white p-1.5 shadow-[0_18px_44px_rgba(21,45,36,0.12)]">
          <button
            type="button"
            onClick={onCopyAddress}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-ink transition-colors hover:bg-panel"
          >
            Copy address
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-muted transition-colors hover:bg-panel hover:text-ink"
          >
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
