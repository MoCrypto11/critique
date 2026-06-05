"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CircleDollarSign,
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
    answer: "Arc provides the payout layer for funding bounties, approving submissions, and recording reward transactions."
  },
  {
    question: "What happens after feedback is approved?",
    answer: "The submission status updates, the configured reward is paid from the bounty, and the payout transaction is saved as a receipt."
  }
];

const arcFeatures = [
  {
    title: "Founder set USDC rewards",
    body: "Founders choose the reward amount before sharing a bounty link. Rewards are shown in USDC, so the value is easy to understand."
  },
  {
    title: "Approve feedback, then pay",
    body: "Testers submit feedback first. The founder reviews each response and only approved submissions trigger payout."
  },
  {
    title: "Receipts without exposing feedback",
    body: "Critique keeps feedback content off-chain and uses Arc for the payment record: bounty funding and approved payouts."
  }
];

export default function HomePage() {
  const [openStep, setOpenStep] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    void ensureDemoBounty();
  }, []);

  return (
    <>
      <AppHeader />
      <main>
        <section className="page-shell grid min-h-[calc(100vh-96px)] content-center md:min-h-[calc(100vh-65px)]">
          <div className="grid items-center gap-7 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="max-w-3xl">
              <p className="eyebrow">Useful feedback. USDC rewards.</p>
              <h1 className="font-display mt-4 max-w-3xl text-4xl leading-tight tracking-normal text-ink sm:text-[3.25rem] lg:text-[3.75rem]">
                Feedback bounties for early product teams
              </h1>
              <p className="mt-5 max-w-xl text-base font-bold leading-7 text-action">
                Create a focused bounty, share one public link, review submissions, and approve USDC rewards for useful
                product feedback.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/create" className="btn-primary">
                  Create a bounty
                </Link>
                <Link href="/bounty/demo" className="btn-secondary">
                  Preview bounty link
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-3 rounded-[1.75rem] border border-action/10 bg-action/[0.035]" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-white shadow-[0_22px_60px_rgba(21,45,36,0.14)]">
                <Image
                  src="/hero-product-feedback.jpg"
                  alt="Contributor reviewing a product experience on a laptop"
                  width={1200}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071a18]/28 via-transparent to-transparent" aria-hidden="true" />
              </div>

              <div className="absolute right-4 top-4 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-xs font-black text-action shadow-[0_12px_32px_rgba(21,45,36,0.14)] backdrop-blur">
                Approved submission
              </div>

              <div className="surface relative mt-4 max-w-md p-4 shadow-[0_18px_55px_rgba(21,45,36,0.12)] sm:absolute sm:bottom-4 sm:left-4 sm:mt-0 sm:max-w-[72%]">
                <p className="text-sm font-bold leading-6 text-ink">
                  “Checkout flow is clear, but pricing is hard to compare.”
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
                  <span>Written feedback</span>
                  <span className="size-1 rounded-full bg-action/40" aria-hidden="true" />
                  <span>Ready for review</span>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 hidden rounded-xl border border-white/50 bg-white/92 p-3 text-sm font-black text-ink shadow-[0_16px_40px_rgba(21,45,36,0.16)] backdrop-blur md:block">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-action" aria-hidden="true" />
                  Reward sent
                </div>
                <p className="mt-1 text-xs font-bold text-muted">Configured payout</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="page-shell scroll-mt-24 py-10 sm:py-12">
          <div className="mb-6 max-w-3xl">
            <p className="eyebrow">How it works</p>
            <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">How Critique works</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              A compact flow for funding one bounty, collecting structured feedback, and approving only the responses
              that help.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            {steps.map((step, index) => {
              const isOpen = openStep === index;
              const StepIcon = step.icon;
              return (
                <div key={step.title} className="surface overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenStep(isOpen ? -1 : index)}
                    className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5"
                  >
                    <span className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-action/10 text-sm font-black text-action">
                        <StepIcon className="size-4" aria-hidden="true" strokeWidth={2} />
                      </span>
                      <span>
                        <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted">
                          Step {index + 1}
                        </span>
                        <span className="block text-lg font-black text-ink">{step.title}</span>
                      </span>
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white">
                      <span
                        className={`size-2.5 border-b-2 border-r-2 border-action transition-transform ${
                          isOpen ? "-rotate-[135deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="border-t border-line/70 px-4 pb-5 pt-4 text-sm leading-6 text-muted sm:px-5">
                      {step.body}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="page-shell py-10 sm:py-12">
          <div className="mb-6 max-w-3xl">
            <p className="eyebrow">Feedback formats</p>
            <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">
              Choose the kind of feedback you need
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
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

        <section className="page-shell py-10 sm:py-12">
          <div className="mb-6 max-w-3xl">
            <p className="eyebrow">For founders</p>
            <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">
              Use Critique before you ship
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Create focused bounties for the feedback that usually gets missed before launch.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {founderUseCases.map((useCase) => {
              const UseCaseIcon = useCase.icon;
              return (
                <article key={useCase.title} className="surface p-4">
                  <UseCaseIcon className="size-4 text-action" aria-hidden="true" strokeWidth={2} />
                  <h3 className="mt-3 text-sm font-black text-ink">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{useCase.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="page-shell py-10 sm:py-12">
          <div className="surface grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Contributor experience</p>
              <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">
                What contributors see
              </h2>
              <p className="mt-3 text-base leading-7 text-muted">
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

        <section id="faq" className="page-shell scroll-mt-24 py-10 sm:py-12">
          <div className="mx-auto mb-6 max-w-3xl text-center">
            <p className="eyebrow">FAQ</p>
            <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Frequently asked questions</h2>
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
                      <span
                        className={`size-2.5 border-b-2 border-r-2 border-action transition-transform ${
                          isOpen ? "-rotate-[135deg] translate-y-0.5" : "rotate-45 -translate-y-0.5"
                        }`}
                        aria-hidden="true"
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

        <section className="page-shell py-10 sm:py-12">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#071a18] text-white shadow-[0_24px_70px_rgba(7,26,24,0.18)]">
            <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:gap-10 lg:p-8">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">BUILT ON ARC TESTNET</p>
                <h2 className="font-display mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl">
                  USDC payouts for useful product feedback
                </h2>
                <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-white/68 sm:text-base">
                  Critique lets founders fund a feedback bounty, share one public link, and reward testers only when their feedback is approved.
                </p>
                <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-white/58 sm:text-base">
                  Arc handles the payout layer: predictable USDC rewards, fast settlement, and visible receipts. Feedback text stays off-chain.
                </p>
                <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-white/58 sm:text-base">
                  Critique currently runs on Arc testnet. The same reward flow can be configured for mainnet USDC once
                  Arc mainnet is available.
                </p>
                <div className="mt-7 inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/14 bg-white/[0.08] px-4 py-2 text-xs font-black text-white">
                  <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
                  Built on Arc testnet
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="https://testnet.arcscan.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-black text-[#071a18] shadow-sm transition-colors hover:bg-[#f8f5eb]"
                  >
                    Explore Arc
                  </a>
                  <a
                    href="https://docs.arc.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-white/16 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-white/[0.1]"
                  >
                    Read Arc docs
                  </a>
                </div>
                <p className="mt-5 max-w-md text-xs font-semibold leading-6 text-white/48">
                  Feedback stays off-chain while Arc records funding and approved payouts.
                </p>
              </div>

              <div className="grid min-w-0 gap-3 lg:pt-8">
                {arcFeatures.map((feature) => (
                  <div key={feature.title} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-4 sm:p-5">
                    <h3 className="text-base font-black text-white">{feature.title}</h3>
                    <p className="mt-2 max-w-xl break-words text-sm font-semibold leading-6 text-white/62">
                      {feature.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-10 sm:py-12">
          <div className="surface flex flex-col items-start justify-between gap-5 p-5 sm:p-7 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="eyebrow">Start focused</p>
              <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">
                Create your first feedback bounty
              </h2>
              <p className="mt-3 text-base leading-7 text-muted">
                Set the reward tiers, share one link, and start collecting useful product feedback on Arc.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/create" className="btn-primary">
                Create a bounty
              </Link>
              <Link href="/bounty/demo" className="btn-secondary">
                Preview bounty link
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
