export function MockModeBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`notice border-line/80 bg-white/75 text-muted shadow-sm ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-ink">Mock mode is active</p>
          <p className="mt-1 leading-6">
            Contract not configured. Deploy the contract and set NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT to enable real USDC
            payments.
          </p>
        </div>
        <span className="w-fit rounded-full border border-action/20 bg-action/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-action">
          Local demo
        </span>
      </div>
    </div>
  );
}
