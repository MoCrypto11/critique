"use client";

import Link from "next/link";
import {
  ChevronDown,
  CircleDollarSign,
  Compass,
  ExternalLink,
  FilePlus2,
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
import { HeroArcMotionLayer } from "@/components/HeroArcMotionLayer";
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
    answer: "Critique is a feedback bounty workflow, not just a form. Arc fits because rewards and fees are denominated in USDC, payouts can settle quickly with deterministic finality, and the app can use familiar EVM smart-contract tooling while keeping feedback content off-chain."
  },
  {
    question: "What happens after feedback is approved?",
    answer: "The submission status updates, the configured reward is paid from the bounty, and the payout transaction is saved as a receipt."
  }
];

const arcHighlights: { title: string; icon: LucideIcon }[] = [
  { title: "USDC reward flow", icon: CircleDollarSign },
  { title: "Founder-approved payouts", icon: UserCheck },
  { title: "Arc testnet explorer", icon: Compass }
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    void ensureDemoBounty();
  }, []);

  return (
    <>
      <AppHeader />
      <main>
        <div className="home-hero-band">
          <HeroArcMotionLayer />
          <section className="hero-stage mx-auto w-full max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pb-14 sm:pt-20 lg:px-8 lg:pb-16 lg:pt-24">
            <div className="relative z-10">
              <p className="eyebrow">Feedback bounties on Arc</p>
              <h1 className="hero-headline font-display mt-6 text-ink">
                Turn Product Feedback Into Funded Bounties For Smarter Product Decisions
              </h1>
              <p className="hero-subcopy mt-9 font-bold text-[#315145]">
                Critique helps teams collect useful product feedback, review submissions, and approve USDC rewards
                through one focused bounty link.
              </p>
            </div>
          </section>
        </div>

        <section className="home-section mx-auto w-full max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-5 sm:pb-8 lg:px-8">
          <div className="surface grid gap-6 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-12">
            <div>
              <p className="eyebrow">Start focused</p>
              <h2 className="section-title mt-3 text-balance text-ink">Create your first feedback bounty</h2>
              <p className="section-intro mt-3 text-muted">
                Set the reward tiers, share one link, and start collecting useful product feedback on Arc.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row xl:shrink-0">
              <Link href="/create" className="btn-primary">
                Create a bounty
              </Link>
              <Link href="/bounty/demo" className="btn-secondary">
                Preview bounty link
              </Link>
            </div>
          </div>
        </section>

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
                <article key={step.title} className="surface flex flex-col p-4 sm:p-5">
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
              <article key={format.type} className="surface p-4 sm:p-5">
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
                <article key={useCase.title} className="surface p-4">
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

        <section className="home-section home-container section-pad">
          <div className="overflow-hidden rounded-3xl border border-[#79D8AF]/25 bg-[#061916] p-6 text-white shadow-[0_24px_64px_rgba(7,26,24,0.2)] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="eyebrow text-[#79D8AF]">Built on Arc testnet</p>
              <h2 className="font-display mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                USDC rewards, settled on Arc testnet
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                Critique uses Arc testnet to demonstrate USDC-based feedback rewards, from bounty funding to approved
                contributor payouts.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {arcHighlights.map(({ title, icon: HighlightIcon }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#79D8AF]/12 text-[#79D8AF]">
                    <HighlightIcon className="size-4" aria-hidden="true" strokeWidth={2} />
                  </span>
                  <span className="text-sm font-bold leading-5 text-white">{title}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://testnet.arcscan.app/"
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#071a18] shadow-sm transition-colors hover:bg-[#f1ede1] sm:w-auto"
              >
                <ExternalLink className="size-4" aria-hidden="true" strokeWidth={2} />
                Arc Explorer
              </a>
              <a
                href="https://docs.arc.io/"
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/16 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-white/[0.1] sm:w-auto"
              >
                <ExternalLink className="size-4" aria-hidden="true" strokeWidth={2} />
                Arc Docs
              </a>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
