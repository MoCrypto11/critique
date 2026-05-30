import { AppHeader } from "@/components/AppHeader";
import { BountyForm } from "@/components/BountyForm";

export default function CreateBountyPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="mb-8 grid gap-6 lg:grid-cols-[0.95fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow">Founder setup</p>
            <h1 className="font-display mt-3 text-4xl leading-tight tracking-normal text-ink sm:text-[3rem]">
              Create feedback bounty
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Set a focused brief, choose the reward, fund the bounty, and share a single tester link.
            </p>
          </div>
          <div className="surface p-5 text-sm leading-6 text-muted">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-action">How it works</p>
            <p className="mt-3">
              Create the bounty brief, fund the USDC pool, then approve only the responses that are useful enough to pay.
            </p>
          </div>
        </div>
        <BountyForm />
      </main>
    </>
  );
}
