"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ensureDemoBounty } from "@/lib/storage";

const steps = [
  {
    title: "Create a bounty",
    body: "Add your product link, write the feedback task, choose the reward, set tester slots, and define a deadline."
  },
  {
    title: "Share one link",
    body: "Send the public bounty link to your community, users, contributors, or testers. No marketplace required."
  },
  {
    title: "Collect useful feedback",
    body: "Testers can submit quick written feedback, deep reviews, video walkthrough links, or technical improvement proposals."
  },
  {
    title: "Approve and pay",
    body: "The founder reviews submissions, approves useful feedback, and the tester receives the USDC reward. A receipt is created for approved payouts."
  }
];

const faqs = [
  {
    question: "Do testers need to pay to submit feedback?",
    answer: "No. Testers submit feedback for free. They only receive a reward if the founder approves their submission."
  },
  {
    question: "When does a tester get paid?",
    answer: "After the founder reviews the submission and approves it. In the live Arc version, approved feedback is paid in USDC."
  },
  {
    question: "What kind of feedback can people submit?",
    answer: "Written feedback, deep product reviews, video walkthrough links, or technical improvement proposals."
  },
  {
    question: "Is this a survey marketplace?",
    answer: "No. Critique is focused on one product at a time: one bounty, one link, useful feedback, and approved rewards."
  },
  {
    question: "Why use USDC?",
    answer: "USDC makes small rewards simple and stable. A $1 feedback reward stays easy to understand."
  },
  {
    question: "Why build this on Arc?",
    answer: "Arc is designed for stablecoin-native apps, making it a good fit for small USDC rewards, payment receipts, and real-world feedback workflows."
  },
  {
    question: "Is the current demo using real USDC?",
    answer: "Not yet if mock mode is active. Mock mode proves the flow. Real USDC payouts require deploying the contract on Arc testnet and configuring the contract address."
  },
  {
    question: "Who is Critique for?",
    answer: "Indie builders, hackathon teams, vibe coders, early founders, designers, and small teams that need useful feedback fast."
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
              <p className="eyebrow">Useful feedback. Instant USDC rewards.</p>
              <h1 className="font-display mt-4 max-w-3xl text-4xl leading-tight tracking-normal text-ink sm:text-[3.25rem] lg:text-[3.75rem]">
                Pay real users for useful product feedback.
              </h1>
              <p className="mt-5 max-w-xl text-base font-bold leading-7 text-action">
                Create a feedback bounty, share one link, approve helpful responses, and reward contributors in USDC.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/create" className="btn-primary">
                  Create Feedback Bounty
                </Link>
                <Link href="/bounty/demo" className="btn-secondary">
                  View Demo Bounty
                </Link>
              </div>
            </div>

            <div className="surface p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-line/70 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Demo bounty</p>
                  <h2 className="mt-2 text-xl font-black text-ink">Test my landing page</h2>
                </div>
                <span className="rounded-full border border-action/25 bg-action/10 px-3 py-1 text-xs font-black text-action">
                  Open
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="surface-soft p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Reward</p>
                  <p className="mt-2 text-2xl font-black text-ink">1 USDC</p>
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
                  Testers submit written feedback, deep reviews, video links, or technical proposals.
                </p>
                <p className="rounded-lg border border-action/20 bg-action/10 p-4 font-semibold text-action">
                  Mock mode keeps the demo usable while the contract address is empty.
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
              Create a focused feedback bounty, share one link, and reward useful responses in USDC.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="space-y-3">
              {steps.map((step, index) => {
                const isOpen = openStep === index;
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
                          {index + 1}
                        </span>
                        <span className="text-lg font-black text-ink">{step.title}</span>
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

            <aside className="surface p-5 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-line/70 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Bounty</p>
                  <h3 className="mt-2 text-xl font-black text-ink">Test my landing page</h3>
                </div>
                <span className="rounded-full border border-action/25 bg-action/10 px-3 py-1 text-xs font-black text-action">
                  Open
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="surface-soft p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Reward</p>
                  <p className="mt-2 text-2xl font-black text-ink">1 USDC</p>
                </div>
                <div className="surface-soft p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Slots</p>
                  <p className="mt-2 text-2xl font-black text-ink">5</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-line/70 bg-panel/70 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Feedback types</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Written", "Video", "Technical"].map((type) => (
                    <span key={type} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-black text-ink">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-action/20 bg-action/10 p-4 text-sm font-semibold leading-6 text-action">
                Founder reviews each response and approves only useful submissions for payout.
              </div>
            </aside>
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
      </main>
    </>
  );
}
