export function MockModeBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`notice border-line/80 bg-white/75 text-muted shadow-sm ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-ink">Local configuration mode</p>
          <p className="mt-1 leading-6">
            Configure the Arc testnet contract address to enable testnet USDC reward payouts.
          </p>
        </div>
        <span className="w-fit rounded-full border border-action/20 bg-action/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-action">
          Local only
        </span>
      </div>
    </div>
  );
}
