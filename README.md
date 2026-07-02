# Critique

**Feedback bounties for product reviews on Arc.**

_Turn product feedback into funded bounties for smarter product decisions._

Critique helps founders and early teams collect the feedback that matters before
they ship. Instead of chasing scattered comments across DMs, Discord, forms, and
group chats, a founder creates one bounty link, collects structured submissions,
reviews feedback one by one, and approves USDC rewards for the feedback that
actually helps.

Current deployment: **Arc testnet** · Live app: **https://usecritique.xyz**

---

## Why Critique

Early products need feedback before they ship, but most feedback workflows are
messy:

- **Forms** collect answers, but they create no incentive to think hard.
- **DMs** are fast, but impossible to organize or compare.
- **Community threads** can be gold, but they get buried in minutes.

Critique turns that into a focused, incentivized loop:

```
brief → submit → review → approve → reward
```

Founders pay only for feedback they decide is useful, and contributors get paid
for signal instead of noise.

## How it works

1. **Create a bounty.** Write a product brief, choose the feedback types you
   accept, set reward amounts, and fund the bounty.
2. **Share one link.** Send the public bounty page to users, testers,
   contributors, or your community.
3. **Submit feedback.** Contributors fill a guided, structured form and provide
   a payout wallet — no wallet connection required to submit.
4. **Review submissions.** The founder works through submissions from the
   internal founder review page, one at a time.
5. **Approve or reject.** Useful feedback is approved and rewarded; weak or
   off-topic feedback is rejected with a reason.
6. **Track receipts.** Funding and approved payouts surface as Arc Explorer
   receipts where available.

## What you can do today

- Create a feedback bounty with a product brief and deadline
- Configure accepted feedback types and per-type reward amounts
- Share a single public bounty link
- Submit structured product feedback as a contributor
- Review submissions from the founder review page
- Approve and pay, or reject with a reason
- Track funding and payout receipts through Arc Explorer

## Architecture

Critique separates **feedback content** from **payment settlement**:

- Feedback content is stored **off-chain** so it stays readable and easy to
  review.
- Approval status and payout metadata are handled by the app.
- Funding and approved payouts settle through the bounty contract on Arc.
- On-chain receipts make funding and payout activity easy to verify.

```
Founder creates bounty
  → Contributor submits feedback
    → Founder reviews submission
      → Approved submission triggers a USDC payout
        → Receipt appears on Arc Explorer
```

## Feedback campaigns (beta, behind a flag)

Campaigns upgrade the single-bounty flow into a funded feedback program with
AI-assisted operations, off by default via `NEXT_PUBLIC_ENABLE_CAMPAIGNS`.

- **Founder** creates a campaign (goal, budget, max reward per task, deadline,
  acceptance criteria, spam rules), funds it in USDC into the
  `CritiqueCampaignEscrowV1` contract, and publishes feedback tasks.
- **AI Campaign Builder** drafts a task plan from the campaign goal; the
  founder edits, approves, and publishes tasks. AI also evaluates submissions
  (summary, quality score, criteria match, spam/duplicate risk, suggested
  action).
- **Contributors** submit structured feedback to a task and get paid in USDC
  when approved.
- **Two payout modes:** Founder Approval (founder clicks approve & pay), and
  Agent-Managed Queued Payout (experimental) — an authorized AI agent address
  may queue payouts that pass the criteria; queued payouts sit in a dispute
  window the founder can cancel in, then become executable.

The agent operates the workflow. The contract protects the money: the escrow
enforces the budget, max reward per task, deadline, pause/close state, the
allowed agent, reserved-funds accounting, the dispute window, and
no-double-payout. The agent cannot withdraw campaign funds or exceed payout
limits. Feedback content and AI evaluations stay off-chain (hashes/URIs are
stored on-chain for auditability).

Enable it with:

```env
NEXT_PUBLIC_ENABLE_CAMPAIGNS=true
NEXT_PUBLIC_CRITIQUE_CAMPAIGN_CONTRACT=0x...   # deploy with npm run deploy:campaign
ANTHROPIC_API_KEY=...                          # server-side only, for the AI endpoints
```

Deploy the campaign escrow to Arc testnet with `npm run deploy:campaign`
(needs `PRIVATE_KEY` in your local env), and apply the Supabase migration in
[`supabase/migrations/20260702_campaigns.sql`](supabase/migrations/20260702_campaigns.sql).
Without a contract address the campaign pages run in local mock mode; without
an Anthropic key the AI endpoints return a clear "not configured" error and
tasks can be created manually.

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- Arc testnet
- viem / wagmi
- Solidity
- Hardhat
- USDC reward flow

## Smart contracts

The bounty contract (`CritiqueDropBountyV2`, source in [`/contracts`](contracts))
supports:

- Creating and funding bounties in a single transaction
- Reward amounts configured per feedback type
- Approving submissions and paying contributors
- Closing bounties
- Refunding unused funds when available

Contract sources are public so anyone can read and review them.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open:

```text
http://localhost:3000
```

The app runs in mock mode out of the box (no contract required) — set
`NEXT_PUBLIC_ENABLE_MOCK_MODE=true` and you can explore the full flow locally.

## Environment variables

| Variable                             | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `NEXT_PUBLIC_ARC_RPC_URL`            | Arc RPC endpoint                                       |
| `NEXT_PUBLIC_ARC_CHAIN_ID`           | Arc chain id                                           |
| `NEXT_PUBLIC_ARC_EXPLORER_URL`       | Arc Explorer base URL                                  |
| `NEXT_PUBLIC_USDC_ADDRESS`           | USDC token address                                     |
| `NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT` | Deployed bounty contract address                       |
| `NEXT_PUBLIC_ENABLE_MOCK_MODE`       | Enables local mock mode when no contract is configured |
| `NEXT_PUBLIC_ENABLE_ARC_MEMOS`       | Enables Arc transaction memos on approvals (off by default) |
| `NEXT_PUBLIC_ARC_MEMO_CONTRACT`      | Arc Memo contract address                              |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase anon key                                      |
| `NEXT_PUBLIC_ENABLE_CAMPAIGNS`       | Enables the feedback-campaign surface (off by default) |
| `NEXT_PUBLIC_CRITIQUE_CAMPAIGN_CONTRACT` | Deployed campaign escrow address (empty = mock mode) |
| `ANTHROPIC_API_KEY`                  | Server-side key for the AI campaign builder/evaluator  |
| `PRIVATE_KEY`                        | Local deployer key for scripts only                    |

`NEXT_PUBLIC_*` variables are exposed to the browser by design — do not put
private secrets in them. `.env.local` should stay local and must not be
committed.

## Available scripts

```bash
npm run dev         # start the Next.js dev server
npm run build       # production build
npm run lint        # lint the project
npm run compile     # compile the smart contracts (Hardhat)
npm run test        # run the contract test suite
npm run deploy:arc  # deploy the bounty contract to Arc testnet
npm run deploy:campaign  # deploy the campaign escrow contract to Arc testnet
```

## Status and security

Critique is currently deployed on **Arc testnet**. The contracts are public for
testing and review, and should not be treated as audited production contracts.

- Feedback content is stored off-chain; funding and payout receipts are recorded
  on-chain where available.
- Critique approves payouts as Arc memo-wrapped transactions: each approval is a
  single Arc Memo transaction that runs the on-chain payout and attaches
  bounty/submission context for clean reconciliation. (Toggle with
  `NEXT_PUBLIC_ENABLE_ARC_MEMOS`.)
- `.env.local` and private keys must never be committed.
- Supabase service role keys must never reach the client.

See [SECURITY.md](SECURITY.md) for the access-control model and the required
Supabase row-level security policies.

## Links

- **Live app** — https://usecritique.xyz
- **Repository** — https://github.com/MoCrypto11/critique
- **Arc** — https://arc.network
- **Arc Explorer** — https://testnet.arcscan.app
