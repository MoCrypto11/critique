"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Blocks,
  ChevronDown,
  CircleDollarSign,
  FilePlus2,
  Fuel,
  Gauge,
  LayoutPanelTop,
  Link2,
  MessageSquareCheck,
  MousePointerClick,
  Route,
  Send,
  Target,
  UserCheck,
  Wallet,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackTypeIcon } from "@/components/FeedbackTypeIcon";
import { HomeAtmosphereBackground } from "@/components/HomeAtmosphereBackground";
import type { FeedbackType } from "@/lib/feedbackRewards";
import { ensureDemoBounty } from "@/lib/storage";

const steps: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Create a bounty",
    body: "Choose the feedback formats, reward amounts, and slots you want to fund.",
    icon: FilePlus2
  },
  {
    title: "Share one link",
    body: "Send contributors a public bounty page for your product or feature.",
    icon: Link2
  },
  {
    title: "Review submissions",
    body: "Read structured feedback before deciding what should be approved.",
    icon: MessageSquareCheck
  },
  {
    title: "Approve and pay",
    body: "Approved submissions receive the configured reward.",
    icon: CircleDollarSign
  }
];

const feedbackFormats: {
  type: FeedbackType;
  title: string;
  body: string;
}[] = [
  {
    type: "quick_written",
    title: "Written feedback",
    body: "Quick feedback on clarity, friction, and product value."
  },
  {
    type: "deep_product_review",
    title: "Deep product review",
    body: "A more detailed review of the product flow, positioning, and user experience."
  },
  {
    type: "video_walkthrough",
    title: "Video walkthrough link",
    body: "A recorded walkthrough showing where the experience works, breaks, or creates confusion."
  },
  {
    type: "technical_proposal",
    title: "Technical improvement proposal",
    body: "Developer-focused suggestions for bugs, UX logic, implementation gaps, or technical improvements."
  }
];

const founderUseCases: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Landing page review",
    body: "Check whether your message is clear before sending traffic.",
    icon: LayoutPanelTop
  },
  {
    title: "Onboarding feedback",
    body: "Find where new users get confused or drop off.",
    icon: Route
  },
  {
    title: "Feature validation",
    body: "See whether a new feature feels useful before investing more time.",
    icon: Target
  },
  {
    title: "Technical review",
    body: "Collect implementation suggestions from developers and technical contributors.",
    icon: Wrench
  },
  {
    title: "Hackathon product feedback",
    body: "Get fast, structured feedback before a demo, submission, or reveal.",
    icon: MousePointerClick
  }
];

const contributorSteps: {
  title: string;
  icon: LucideIcon;
}[] = [
  { title: "Open the bounty link", icon: Link2 },
  { title: "Choose a feedback format", icon: Target },
  { title: "Submit useful feedback", icon: Send },
  { title: "Enter a payout wallet", icon: Wallet },
  { title: "Wait for approval", icon: UserCheck }
];

const faqs = [
  {
    question: "Who is Critique for?",
    answer: "Critique is for founders, product teams, and early-stage teams that need structured product feedback before launch."
  },
  {
    question: "Do contributors need to connect a wallet?",
    answer: "No. Contributors can submit feedback without connecting a wallet. They only enter a payout wallet address."
  },
  {
    question: "Can feedback types have different rewards?",
    answer: "Yes. Founders can configure different USDC rewards and slot counts for each accepted feedback format."
  },
  {
    question: "Are rewards real USDC?",
    answer: "Critique currently runs on Arc testnet, so rewards use testnet USDC. The payout flow is designed around USDC rewards."
  },
  {
    question: "Why build Critique on Arc?",
    answer: "Critique pays contributors in USDC the moment feedback is approved, so the settlement layer matters. Arc denominates rewards in USDC, clears payouts quickly with deterministic finality, and supports standard EVM tooling for funding and approvals — while feedback content stays off-chain."
  },
  {
    question: "What happens after feedback is approved?",
    answer: "The submission status updates, the configured reward is paid from the bounty, and the payout transaction is saved as a receipt."
  }
];

const arcFeatures: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "USDC gas",
    body: "Fees and rewards use USDC, so the payment flow stays easy to understand.",
    icon: Fuel
  },
  {
    title: "Fast finality",
    body: "Approved payouts can settle quickly with deterministic finality.",
    icon: Gauge
  },
  {
    title: "EVM compatible",
    body: "Critique can use familiar smart-contract tooling for bounty funding and approvals.",
    icon: Blocks
  },
  {
    title: "Native USDC",
    body: "Arc is designed around native USDC movement, not fragmented wrapped assets.",
    icon: CircleDollarSign
  }
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    void ensureDemoBounty();
  }, []);

  return (
    <div className="home-theme">
      <HomeAtmosphereBackground />
      <div className="relative z-10">
        <AppHeader />
        <main>
          <div className="home-hero-band">
            <section className="hero-stage mx-auto w-full max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
              <div className="grid items-center gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
                <div className="relative z-10">
                  <p className="eyebrow">Feedback bounties on Arc</p>
                  <h1 className="hero-headline font-display mt-6 text-ink">
                    Turn Product Feedback Into <span className="text-[#7fe0b6]">Funded Bounties</span> For Smarter
                    Product Decisions
                  </h1>
                  <p className="hero-subcopy mt-7 font-semibold text-[#a9c2b5]">
                    Critique helps teams collect useful product feedback, review submissions, and approve USDC rewards
                    through one focused bounty link.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/create" className="btn-primary hero-cta">
                      Create a bounty
                    </Link>
                    <Link href="/bounty/demo" className="btn-secondary hero-cta">
                      Preview bounty link
                    </Link>
                  </div>
                </div>

                {/* Illustrative bounty preview — visual only, not connected to real data. */}
                <div className="relative z-10">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.25rem] bg-[#7fe0b6]/12 blur-[72px]"
                  />
                  <article className="surface mx-auto w-full max-w-md p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full border border-[#7fe0b6]/25 bg-[#7fe0b6]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#7fe0b6]">
                        Bounty preview
                      </span>
                      <span className="inline-flex rounded-full border border-action/30 bg-action/10 px-3 py-1 text-xs font-black text-[#7fe0b6]">
                        Open
                      </span>
                    </div>

                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold leading-snug text-ink">Review my onboarding flow</h3>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Where do new users get confused or drop off?
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Reward</p>
                        <p className="mt-0.5 text-base font-black text-[#7fe0b6]">USDC</p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                      <div>
                        <p className="text-base font-black text-ink">6</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-muted">Slots</p>
                      </div>
                      <div>
                        <p className="text-base font-black text-ink">3</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-muted">Formats</p>
                      </div>
                      <div>
                        <p className="text-base font-black text-ink">USDC</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-muted">Payout</p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-muted">
                      Approve the submissions worth paying — rewards settle in USDC on Arc.
                    </p>
                  </article>
                </div>
              </div>
            </section>
        </div>

        <section
          id="how-it-works"
          className="home-section home-section-soft home-container section-pad scroll-mt-24"
        >
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title text-ink">How Critique works</h2>
            <p className="section-intro text-muted">
              A compact flow for funding one bounty, collecting structured feedback, and approving only the responses
              that help.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <article key={step.title} className="surface card-hover flex flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-action/10 text-action">
                      <StepIcon className="size-4" aria-hidden="true" strokeWidth={2} />
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="home-section home-container section-pad">
          <div className="section-head">
            <p className="eyebrow">Feedback formats</p>
            <h2 className="section-title text-ink">Choose the kind of feedback you need</h2>
            <p className="section-intro text-muted">
              Set different rewards for different contribution formats, from quick written feedback to deeper product
              and technical reviews.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {feedbackFormats.map((format) => (
              <article key={format.type} className="surface card-hover p-4 sm:p-5">
                <span className="grid size-10 place-items-center rounded-lg bg-action/10 text-action">
                  <FeedbackTypeIcon type={format.type} />
                </span>
                <h3 className="mt-4 text-base font-black text-ink">{format.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{format.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section home-container section-pad">
          <div className="section-head">
            <p className="eyebrow">For founders</p>
            <h2 className="section-title text-ink">Use Critique before you ship</h2>
            <p className="section-intro text-muted">
              Create focused bounties for the feedback that usually gets missed before launch.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {founderUseCases.map((useCase) => {
              const UseCaseIcon = useCase.icon;
              return (
                <article key={useCase.title} className="surface card-hover p-4">
                  <span className="grid size-10 place-items-center rounded-lg bg-action/10 text-action">
                    <UseCaseIcon className="size-4" aria-hidden="true" strokeWidth={2} />
                  </span>
                  <h3 className="mt-3 text-sm font-black text-ink">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{useCase.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="home-section home-container section-pad">
          <div className="surface grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Contributor experience</p>
              <h2 className="section-title mt-3 text-ink">What contributors see</h2>
              <p className="section-intro mt-3 text-muted">
                Contributors can submit feedback without connecting a wallet.
              </p>
              <p className="mt-4 rounded-lg border border-action/15 bg-action/10 p-3 text-sm font-semibold leading-6 text-action">
                Feedback is reviewed by the founder. Only approved submissions receive the configured reward.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contributorSteps.map((step, index) => {
                const ContributorIcon = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border border-line/70 bg-panel/70 p-4">
                    <div className="flex items-center gap-2 sm:block">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-action shadow-sm">
                        <ContributorIcon className="size-4" aria-hidden="true" strokeWidth={2} />
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted sm:mt-3 sm:block">
                        {index + 1}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black leading-5 text-ink">{step.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="home-section home-container section-pad scroll-mt-24">
          <div className="section-head mx-auto text-center">
            <p className="eyebrow">FAQ</p>
            <h2 className="section-title mt-3 text-ink">Frequently asked questions</h2>
          </div>

          <div className="mx-auto max-w-4xl space-y-3">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.question} className="surface overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="text-base font-black text-ink">{item.question}</span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white">
                      <ChevronDown
                        className={`size-4 text-action transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                        strokeWidth={2}
                      />
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="border-t border-line/70 px-5 pb-5 pt-4 text-sm leading-7 text-muted sm:text-base">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="home-section home-section-soft home-container section-pad">
          <div className="arc-network-card overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="mx-auto max-w-3xl text-center">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">BUILT ON</p>
                  <a
                    href="https://www.arc.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/14 bg-white/[0.08] px-3.5 py-2 text-xs font-black text-white transition-colors hover:bg-white/[0.12]"
                  >
                    <Image src="/images/arc-icon.svg" alt="" aria-hidden="true" width={14} height={14} className="size-3.5" />
                    Built on Arc
                  </a>
                </div>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.08]">
                    <Image src="/images/arc-icon.svg" alt="" aria-hidden="true" width={24} height={24} className="size-6" />
                  </span>
                  <h2 className="font-display text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">
                    Arc Network
                  </h2>
                </div>
                <p className="mt-4 text-base font-semibold leading-7 text-white/72 sm:text-lg">
                  Stablecoin-native infrastructure for approval-based payouts.
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/55 sm:text-base">
                  USDC rewards, fast settlement, and EVM tooling for bounty workflows.
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {arcFeatures.map((feature) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] p-4 sm:p-5"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#79D8AF]/15 text-[#7fe0b6]">
                        <FeatureIcon className="size-4" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-base font-black text-white">{feature.title}</h3>
                      <p className="mt-2 break-words text-sm font-semibold leading-6 text-white/62">{feature.body}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="https://testnet.arcscan.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ffffff] px-5 py-3 text-sm font-black text-[#071a18] shadow-sm transition-colors hover:bg-[#f1ede1]"
                >
                  Arc Explorer
                </a>
                <a
                  href="https://docs.arc.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-white/16 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-white/[0.1]"
                >
                  Read Arc docs
                </a>
              </div>
            </div>
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}
