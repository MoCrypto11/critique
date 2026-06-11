import Image from "next/image";
import Link from "next/link";

const productLinks = [
  { label: "Create", href: "/create" },
  { label: "Preview bounty", href: "/bounty/demo" },
  { label: "Dashboard", href: "/dashboard" }
];

const resourceLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" }
];

const arcLinks = [
  { label: "Arc Explorer", href: "https://testnet.arcscan.app/" },
  { label: "Arc Docs", href: "https://docs.arc.io/" }
];

function FooterColumn({
  title,
  links,
  external
}: {
  title: string;
  links: { label: string; href: string }[];
  external?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="text-sm font-semibold text-white/70 transition-colors hover:text-white">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#071a18] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.08]">
                <Image
                  src="/brand/critique-icon-final.svg"
                  alt=""
                  aria-hidden="true"
                  width={22}
                  height={22}
                  className="h-auto w-[22px]"
                />
              </span>
              <span className="text-xl font-black tracking-tight text-white">Critique</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Collect useful product feedback and approve USDC rewards through one focused bounty link.
            </p>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
          <FooterColumn title="Built on Arc testnet" links={arcLinks} external />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs font-semibold text-white/55">&copy; 2026 Critique. Built on Arc testnet.</p>
        </div>
      </div>
    </footer>
  );
}
