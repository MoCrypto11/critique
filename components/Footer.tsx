import Link from "next/link";

const footerLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/bounty/demo", label: "Demo" },
  { href: "/create", label: "Create bounty" },
  { href: "/#faq", label: "FAQ" }
];

export function Footer() {
  return (
    <footer className="mt-12 bg-[#071a18] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1fr_0.85fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex text-lg font-black tracking-normal text-white">
            CritiqueDrop
          </Link>
          <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-white/70">
            Useful feedback. Instant USDC rewards.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:items-start">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-bold text-white/72 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="lg:text-right">
          <div className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-base font-black text-white">
            Built on Arc
          </div>
          <p className="mt-3 text-xs leading-5 text-white/55">
            CritiqueDrop is an independent demo project.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl px-4 py-4 text-xs font-semibold text-white/55 sm:px-6 lg:px-8">
          <p>&copy; 2026 CritiqueDrop. Built on Arc.</p>
        </div>
      </div>
    </footer>
  );
}
