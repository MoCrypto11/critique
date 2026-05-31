# Critique

## What is Critique?

Critique is a paid feedback link for builders. A founder creates a feedback bounty, funds it with USDC on Arc, shares one public link, reviews submissions, and approves useful feedback for USDC payout.

## Example flow

1. Create bounty.
2. Fund bounty with USDC.
3. Share public link.
4. Tester submits feedback.
5. Founder approves.
6. Tester gets paid.
7. Dashboard shows receipt.

## Install

```bash
npm install
```

## Run locally

```bash
cp .env.example .env.local
npm run dev
```

## Compile contract

```bash
npx hardhat compile
```

## Run tests

```bash
npx hardhat test
```

## Deploy contract

```bash
npx hardhat run scripts/deploy.ts --network arcTestnet
```

## Configure after deploy

```env
NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT=0x...
```

## Important notes

- Feedback text is stored off-chain/local.
- Contract only handles bounty funding and payouts.
- Verify Arc values through Arc Docs MCP.
- This is MVP code, not audited production code.
- Arc Testnet uses USDC as native gas. The ERC-20 USDC interface for approvals and payouts uses 6 decimals.
