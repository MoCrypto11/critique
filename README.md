# Critique

**Feedback bounties for product reviews on Arc.**

Critique lets founders post paid bounties for structured product feedback and
pay contributors in USDC on the [Arc](https://arc.network) testnet. Founders
fund a bounty, share a public link, collect structured feedback, then review
each submission and approve the useful ones for payout — with on-chain receipts
for funding and payouts.

> **Stage: Arc testnet / experimental.** This is an experimental project running
> on the Arc **testnet**. It uses testnet USDC only — no mainnet funds are
> involved. See [Security & disclaimers](#security--disclaimers).

Live site: **https://usecritique.xyz**

---

## What it does

- **Founders** create a focused feedback bounty for their product, choose
  feedback formats and per-format rewards, and fund it with testnet USDC.
- **Contributors** open the public bounty link and submit structured feedback
  (no wallet connection required to submit — they just provide a payout wallet
  address).
- **Founders** review submissions one at a time, approve and pay the useful
  ones, or reject with a reason.
- Funding and approved payouts are recorded on-chain, with **Arc Explorer**
  receipt links surfaced in the founder dashboard when available.

## Who it's for

- **Founders / product teams** who want honest, structured feedback and are
  willing to pay for signal instead of noise.
- **Contributors / testers** who want to get paid for thoughtful product
  feedback.

## How the flow works

1. **Create a bounty** — title, product URL, instructions, feedback formats,
   per-format reward amounts, slots, and deadline.
2. **Fund it** — approve and fund the bounty with testnet USDC (one
   create-and-fund transaction).
3. **Share the public link** — contributors open it and submit feedback.
4. **Submit feedback** — contributors fill a guided form and provide a payout
   wallet address.
5. **Founder review** — submissions appear in a review overview (Pending /
   Approved / Rejected / All); the founder opens one submission at a time.
6. **Approve & pay or reject** — approving pays the configured USDC reward to
   the contributor's payout wallet; rejecting records a reason.
7. **On-chain receipts** — funding and approved-payout transactions are shown
   with shortened hashes, copy, and **View on Arc Explorer** links when
   available. Feedback content stays off-chain.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** (dark glass design system)
- **Supabase** for shared bounty/submission persistence
- **Arc testnet** smart contract for bounty funding and payout state
- **viem / wagmi** wallet integration and **USDC** reward flow

## Local setup

Requirements: Node.js 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file from the template
cp .env.example .env.local
# then fill in the values in .env.local (see the table below)

# 3. Run the dev server
npm run dev
```

Then open http://localhost:3000.

### Environment variables

Copy `.env.example` to `.env.local` and fill in your own values. **Never commit
`.env.local`** — it is gitignored.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ARC_RPC_URL` | Arc testnet RPC endpoint |
| `NEXT_PUBLIC_ARC_CHAIN_ID` | Arc testnet chain id |
| `NEXT_PUBLIC_ARC_EXPLORER_URL` | Arc Explorer base URL (for receipt links) |
| `NEXT_PUBLIC_USDC_ADDRESS` | Testnet USDC token address |
| `NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT` | Deployed bounty contract address (leave empty to run in mock mode) |
| `NEXT_PUBLIC_ENABLE_MOCK_MODE` | `true` to run the UI without a contract |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `PRIVATE_KEY` | **Local only.** Deployer key for contract scripts. Never commit this. |

The `NEXT_PUBLIC_*` values are inlined into the client bundle by design (the
Supabase **anon** key is public and protected by row-level security). `PRIVATE_KEY`
is used only by local deployment scripts (`hardhat.config.ts`) and is read from
your environment — it is never referenced in app/frontend code.

### Build & lint

```bash
npm run build
npm run lint
```

### Smart contract (optional)

The app runs without a contract in mock mode (`NEXT_PUBLIC_ENABLE_MOCK_MODE=true`).
To work with the on-chain bounty contract:

```bash
npx hardhat compile                                   # compile
npx hardhat test                                      # run contract tests
npx hardhat run scripts/deploy.ts --network arcTestnet # deploy (needs PRIVATE_KEY in env)
```

After deploying, set the deployed address in `.env.local`:

```env
NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT=0x...
```

## Notes

- Feedback content is stored **off-chain** (Supabase); the contract handles
  bounty funding and payout state only.
- Approved submissions are paid the reward configured for the selected feedback
  format.
- Arc testnet uses USDC as native gas; the ERC-20 USDC interface for approvals
  and payouts uses 6 decimals.

## Security & disclaimers

- **Experimental, Arc testnet only.** No mainnet funds are involved; rewards use
  testnet USDC.
- **Smart contracts are not audited.** Use at your own risk.
- **Never commit secrets.** `.env.local` (and any real keys) must stay out of
  git. Only `.env.example` with placeholder values is tracked.
- This project makes **no claims** of audits, partnerships, traction, or
  mainnet readiness.
