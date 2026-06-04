"use client";

import Link from "next/link";
import { CircleDollarSign, FilePlus2, Link2, MessageSquareCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ensureDemoBounty } from "@/lib/storage";

const steps: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Create a bounty",
    body: "Add your product link, write the feedback task, choose accepted feedback types, set reward amounts, assign slots, and define a deadline.",
    icon: FilePlus2
  },
  {
    title: "Share one link",
    body: "Send the public bounty link to your community, users, or contributors. No marketplace required.",
    icon: Link2
  },
  {
    title: "Collect useful feedback",
    body: "Contributors can submit written feedback, deep product reviews, video walkthrough links, or technical improvement proposals.",
    icon: MessageSquareCheck
  },
  {
    title: "Approve and pay",
    body:
      "Founder reviews useful submissions, approves the responses that help, and rewards are paid through the Arc testnet flow using testnet USDC.",
    icon: CircleDollarSign
  }
];

const faqs = [
  {
    question: "Do contributors need to pay to submit feedback?",
    answer: "No. Contributors submit feedback without paying. They receive a reward only when the founder approves their submission."
  },
  {
    question: "When does a contributor get paid?",
    answer: "After the founder reviews and approves the submission. Today, approved submissions are paid with testnet USDC on Arc testnet."
  },
  {
    question: "What kind of feedback can people submit?",
    answer: "Contributors can submit written feedback, deep product reviews, video walkthrough links, or technical improvement proposals."
  },
  {
    question: "Is this a survey marketplace?",
    answer: "No. Critique is focused on one product at a time: one founder-funded bounty, one public link, structured feedback, and approved rewards."
  },
  {
    question: "Why build Critique on Arc?",
    answer:
      "Critique is built around small, approval-based reward flows. Arc is a strong fit because it is stablecoin-native, uses USDC for gas, supports EVM smart contracts, and provides fast deterministic settlement. That lets Critique demonstrate product-feedback payouts without introducing a volatile gas token or unnecessary payment complexity."
  },
  {
    question: "Can different feedback types have different rewards?",
    answer:
      "Yes. Founders can choose which feedback formats they accept and configure the reward amount for each one. A written response may have a different reward than a deep product review, video walkthrough, or technical improvement proposal."
  },
  {
    question: "Are rewards real USDC?",
    answer:
      "Critique currently runs on Arc testnet, so rewards use testnet USDC for demonstration and testing. The payout flow is designed around USDC and can be configured for mainnet USDC once Arc mainnet is available."
  },
  {
    question: "Who is Critique for?",
    answer: "Critique is for founders, product teams, designers, developers, hackathon teams, and small teams validating product ideas."
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
              <p className="eyebrow">Useful feedback. Testnet USDC rewards.</p>
              <h1 className="font-display mt-4 max-w-3xl text-4xl leading-tight tracking-normal text-ink sm:text-[3.25rem] lg:text-[3.75rem]">
                Pay real users for useful product feedback.
              </h1>
              <p className="mt-5 max-w-xl text-base font-bold leading-7 text-action">
                Create a feedback bounty, share one link, approve helpful responses, and test USDC reward flows on Arc testnet.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/create" className="btn-primary">
                  Create Feedback Bounty
                </Link>
                <Link href="/bounty/demo" className="btn-secondary">
                  Preview Bounty Link
                </Link>
              </div>
            </div>

            <div className="surface p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-line/70 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Example bounty</p>
                  <h2 className="mt-2 text-xl font-black text-ink">Test my landing page</h2>
                </div>
                <span className="rounded-full border border-action/25 bg-action/10 px-3 py-1 text-xs font-black text-action">
                  Open
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="surface-soft p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Reward</p>
                  <p className="mt-2 text-xl font-black leading-tight text-ink">Founder-set reward</p>
                </div>
                <div className="surface-soft p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Slots</p>
                  <p className="mt-2 text-2xl font-black text-ink">5</p>
                </div>
                <div className="surface-soft p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Review</p>
                  <p className="mt-2 text-2xl font-black text-ink">Manual</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-6 text-muted">
                <p className="rounded-lg border border-line/70 bg-panel/70 p-4">
                  Contributors submit written feedback, deep reviews, video links, or technical proposals.
                </p>
                <p className="rounded-lg border border-action/20 bg-action/10 p-4 font-semibold text-action">
                  Built on Arc testnet with testnet USDC rewards. The flow is designed for USDC payouts once Arc
                  mainnet is available.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="page-shell scroll-mt-24 py-14 sm:py-16">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow">How it works</p>
            <h2 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">How Critique works</h2>
            <p className="mt-4 text-lg leading-8 text-muted">
              Create a focused feedback bounty, share one link, and reward approved responses with founder-configured
              testnet USDC rewards.
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const isOpen = openStep === index;
              const StepIcon = step.icon;
              return (
                <div key={step.title} className="surface overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenStep(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="flex items-center gap-4">
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
                    <p className="border-t border-line/70 px-5 pb-5 pt-4 text-sm leading-7 text-muted sm:pl-[4.75rem]">
                      {step.body}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section id="faq" className="page-shell scroll-mt-24 py-14 sm:py-16">
          <div className="mx-auto mb-8 max-w-3xl text-center">
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
                    <span className="text-base font-black text-ink sm:text-lg">{item.question}</span>
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

        <section className="page-shell py-10 sm:py-14">
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
                  Critique is an independent demo project built on Arc testnet.
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
      </main>
    </>
  );
}
