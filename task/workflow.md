# task/workflow.md — Codex Build Supervisor for CritiqueDrop

You are Codex. Build this project from start to finish.

This file is the supervisor. Follow it strictly.

Do not brainstorm.
Do not add extra features.
Do not turn this into a general marketplace.
Do not guess Arc configuration values.

---

## 0. Mandatory first step: use Arc Docs MCP

Before writing any Arc network config, wallet config, deployment config, RPC URL, chain ID, explorer URL, native currency logic, USDC address, gas assumptions, or contract deployment instructions, use the Arc Docs MCP server.

The Arc Docs MCP server should be configured in Codex as:

```toml
[mcp_servers.arc-docs]
url = "https://docs.arc.io/mcp"
enabled = true
required = true
tool_timeout_sec = 60
```

Before coding, search Arc docs through MCP for:

1. Arc testnet chain ID
2. Arc testnet RPC URL
3. Arc block explorer URL
4. Arc native gas / USDC fee behavior
5. USDC token address or official token guidance
6. Faucet instructions
7. Contract deployment instructions
8. Wallet connection instructions
9. Any Arc-specific EVM compatibility notes

Rules:

- Use only values verified through Arc Docs MCP.
- If the MCP server is not available, stop guessing.
- If a value cannot be found in Arc docs, create a placeholder and clearly mark it as `MUST_VERIFY_FROM_ARC_DOCS`.
- Do not hardcode random addresses.
- Do not use old values from memory.
- Add a short `docs-verification.md` file listing each Arc value you used and the Arc docs page/source you got it from.

---

## 1. Project name

CritiqueDrop

---

## 2. One-line product

A paid feedback link where builders fund a USDC bounty on Arc, collect feedback from real testers, and approve useful responses for instant USDC payout.

---

## 3. Product thesis

Builders do not need fake praise or vague comments.

They need real people to test their product, landing page, demo, or app and tell them what is confusing, what is clear, and whether they would use it.

CritiqueDrop lets a builder do this:

1. Create a feedback bounty.
2. Fund it with USDC.
3. Share one public link.
4. Get feedback from testers.
5. Approve useful responses.
6. Pay approved testers instantly in USDC.

---

## 4. What this app is NOT

Do not build any of these:

- General bounty marketplace
- Freelance escrow
- Invoice app
- Payment link app
- Generic task marketplace
- Paywall
- Subscription app
- Donation app
- Job board
- Social feed
- AI agent marketplace
- Token launch
- NFT app
- Reputation network

This app is only:

> A paid feedback bounty link for builders.

---

## 5. Core MVP flow

Build exactly this flow:

### Founder flow

1. Founder connects wallet.
2. Founder creates a feedback bounty:
   - title
   - product URL
   - feedback instructions
   - reward per approved feedback
   - number of tester slots
   - deadline
3. Founder funds bounty with USDC.
4. App generates a shareable bounty link.
5. Founder reviews submitted feedback.
6. Founder approves useful feedback.
7. Approved tester gets paid in USDC.
8. Founder can refund unused bounty funds after deadline or after closing bounty.

### Tester flow

1. Tester opens public bounty link.
2. Tester sees:
   - product URL
   - reward amount
   - slots left
   - deadline
   - feedback instructions
3. Tester submits:
   - wallet address
   - answer 1
   - answer 2
   - answer 3
   - optional proof link
4. Submission status becomes pending.
5. If founder approves, tester receives USDC.

---

## 6. Tech stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Solidity
- Hardhat
- OpenZeppelin contracts
- Wagmi + Viem
- RainbowKit or a simple wallet connect setup
- Local/mock storage for MVP feedback data

Do not add Supabase unless everything else is already working.

Local storage is acceptable for the MVP because feedback text should stay off-chain anyway.

---

## 7. Required folder structure

Create or organize the project like this:

```txt
critique-drop/
  app/
    page.tsx
    create/
      page.tsx
    bounty/
      [id]/
        page.tsx
        review/
          page.tsx
        dashboard/
          page.tsx

  components/
    AppHeader.tsx
    WalletConnect.tsx
    BountyForm.tsx
    BountyStatusBadge.tsx
    SubmissionCard.tsx
    ReceiptCard.tsx
    StatCard.tsx
    EmptyState.tsx
    TxHashLink.tsx

  contracts/
    CritiqueDropBounty.sol
    MockUSDC.sol

  scripts/
    deploy.ts

  test/
    CritiqueDropBounty.test.ts

  lib/
    arc.ts
    contracts.ts
    usdc.ts
    storage.ts
    hash.ts
    utils.ts

  docs-verification.md
  .env.example
  README.md
```

---

## 8. Pages to build

Build only these pages.

---

### 8.1 Home page

Route:

```txt
/
```

Goal:

Explain the product in less than 10 seconds.

Must include:

- App name: `CritiqueDrop`
- Tagline: `Pay people for useful feedback, not empty opinions.`
- Short explanation:
  `Create a feedback bounty, fund it with USDC, share one link, and reward testers whose feedback actually helps.`
- Primary button: `Create Feedback Bounty`
- Secondary button: `View Demo Bounty`

No long crypto explanation.
No fake marketing sections.
No huge landing page.

---

### 8.2 Create bounty page

Route:

```txt
/create
```

Founder form fields:

- Bounty title
- Product URL
- Feedback instructions
- Reward per approved response in USDC
- Number of tester slots
- Deadline date/time

Validation:

- Title required
- Product URL must be valid
- Reward must be greater than 0
- Slots must be at least 1
- Deadline must be in the future

After submit:

1. Save bounty metadata locally.
2. Ask founder to create bounty on the smart contract.
3. Ask founder to fund the bounty with USDC.
4. Redirect to `/bounty/[id]`.

If contract is not configured:

- Use mock mode if enabled.
- Show a clear banner:
  `Contract not configured. Running in mock mode. Deploy contract and set NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT to enable real USDC payments.`

---

### 8.3 Public bounty page

Route:

```txt
/bounty/[id]
```

This is the link the founder shares.

Show:

- Bounty title
- Product URL with button: `Open product`
- Feedback instructions
- Reward amount
- Slots remaining
- Deadline
- Status:
  - Open
  - Full
  - Expired
  - Closed

Tester form fields:

- Tester wallet address
- `What confused you?`
- `What did you understand clearly?`
- `Would you use it or sign up? Why or why not?`
- Optional proof link:
  - screenshot
  - Loom
  - demo recording
  - GitHub issue
  - any URL

Validation:

- Wallet address should look like an EVM address
- Three required answers cannot be empty
- Do not allow submission if bounty is full
- Do not allow submission if deadline passed
- Do not allow duplicate local submission from the same wallet if possible

After submit:

- Generate submission hash
- Store submission locally
- Mark status as `pending`
- Show:
  `Feedback submitted. If approved, this wallet receives the USDC reward.`

---

### 8.4 Review submissions page

Route:

```txt
/bounty/[id]/review
```

Founder review page.

Show all submissions as cards.

Each card must show:

- Tester wallet
- Three answers
- Optional proof link
- Status:
  - Pending
  - Approved
  - Rejected
- If pending:
  - Button: `Approve and Pay`
  - Button: `Reject`

Approve and Pay behavior:

1. Confirm wallet is connected.
2. Confirm connected wallet is founder when possible.
3. Call smart contract `approveSubmission`.
4. Update local submission status to `approved`.
5. Store transaction hash.
6. Show paid receipt state.

Reject behavior:

1. Ask for rejection reason.
2. Save status as `rejected`.
3. Save rejection reason.
4. Do not pay.

---

### 8.5 Dashboard / receipt page

Route:

```txt
/bounty/[id]/dashboard
```

Show:

- Bounty title
- Total funded
- Total paid
- Remaining balance
- Reward per submission
- Slots used
- Approved count
- Pending count
- Rejected count
- Deadline
- Transaction hashes
- Refund unused funds button after deadline or after bounty is closed

Receipt cards should show:

- Tester wallet
- Amount paid
- Status
- Transaction hash
- Submission hash
- Date/time

---

## 9. Smart contract

Create:

```txt
contracts/CritiqueDropBounty.sol
```

Use Solidity:

```solidity
pragma solidity ^0.8.20;
```

Use OpenZeppelin:

- IERC20
- SafeERC20
- ReentrancyGuard

The contract handles only:

- bounty creation
- USDC funding
- approval payout
- refund unused funds

Do not store full feedback text on-chain.

---

## 10. Smart contract data model

Create:

```solidity
struct Bounty {
    address founder;
    uint256 rewardPerSubmission;
    uint256 maxSubmissions;
    uint256 approvedCount;
    uint256 deadline;
    uint256 fundedAmount;
    uint256 paidAmount;
    string metadataURI;
    bool closed;
}
```

Create:

```solidity
IERC20 public immutable usdc;
uint256 public nextBountyId;

mapping(uint256 => Bounty) public bounties;
mapping(uint256 => mapping(address => bool)) public paidTester;
mapping(uint256 => mapping(bytes32 => bool)) public usedSubmissionHash;
```

---

## 11. Required contract functions

Implement:

```solidity
constructor(address _usdc)
```

```solidity
function createBounty(
    uint256 rewardPerSubmission,
    uint256 maxSubmissions,
    uint256 deadline,
    string calldata metadataURI
) external returns (uint256 bountyId)
```

```solidity
function fundBounty(uint256 bountyId, uint256 amount) external
```

```solidity
function approveSubmission(
    uint256 bountyId,
    address tester,
    bytes32 submissionHash
) external nonReentrant
```

```solidity
function refundUnused(uint256 bountyId) external nonReentrant
```

```solidity
function closeBounty(uint256 bountyId) external
```

```solidity
function getBounty(uint256 bountyId) external view returns (Bounty memory)
```

```solidity
function remainingFunds(uint256 bountyId) public view returns (uint256)
```

---

## 12. Contract rules

- Reward per submission must be greater than 0.
- Max submissions must be greater than 0.
- Deadline must be in the future.
- Only founder can approve submissions.
- Only founder can close bounty.
- Only founder can refund unused funds.
- Cannot approve if bounty is closed.
- Cannot approve after max submissions reached.
- Cannot pay the same tester twice for the same bounty.
- Cannot reuse the same submission hash.
- Cannot pay if contract has insufficient remaining bounty funds.
- Approval immediately transfers USDC to tester.
- Refund sends unused USDC back to founder.
- Refund works only after deadline or after bounty is closed.
- Use SafeERC20 for all token transfers.
- Use ReentrancyGuard for payout/refund paths.

---

## 13. Required contract events

Emit:

```solidity
event BountyCreated(
    uint256 indexed bountyId,
    address indexed founder,
    uint256 rewardPerSubmission,
    uint256 maxSubmissions,
    uint256 deadline,
    string metadataURI
);
```

```solidity
event BountyFunded(
    uint256 indexed bountyId,
    address indexed founder,
    uint256 amount
);
```

```solidity
event SubmissionApproved(
    uint256 indexed bountyId,
    address indexed tester,
    bytes32 indexed submissionHash
);
```

```solidity
event TesterPaid(
    uint256 indexed bountyId,
    address indexed tester,
    uint256 amount
);
```

```solidity
event BountyClosed(uint256 indexed bountyId);
```

```solidity
event UnusedRefunded(
    uint256 indexed bountyId,
    address indexed founder,
    uint256 amount
);
```

---

## 14. Contract tests

Create:

```txt
test/CritiqueDropBounty.test.ts
```

Also create:

```txt
contracts/MockUSDC.sol
```

Mock USDC must use 6 decimals.

Tests must cover:

1. Create bounty successfully.
2. Reject bounty with zero reward.
3. Reject bounty with zero slots.
4. Reject bounty with past deadline.
5. Fund bounty with mock USDC.
6. Founder approves submission and tester gets paid.
7. Non-founder cannot approve.
8. Same tester cannot be paid twice.
9. Same submission hash cannot be reused.
10. Cannot approve more than max submissions.
11. Cannot approve without enough funded balance.
12. Founder can close bounty.
13. Founder can refund unused funds after close.
14. Founder can refund unused funds after deadline.
15. Non-founder cannot refund.

Run:

```bash
npx hardhat test
```

Fix failing tests before continuing.

---

## 15. Arc config files

Create:

```txt
lib/arc.ts
```

This file must be built from values verified by Arc Docs MCP.

Do not use guessed values.

If a value is missing, use placeholders like:

```ts
export const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "0"); // MUST_VERIFY_FROM_ARC_DOCS
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || ""; // MUST_VERIFY_FROM_ARC_DOCS
export const ARC_EXPLORER_URL = process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || ""; // MUST_VERIFY_FROM_ARC_DOCS
```

Create:

```txt
lib/usdc.ts
```

Use:

```ts
export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS || "";
```

If USDC address is empty, show frontend warning.

Create:

```txt
lib/contracts.ts
```

Use:

```ts
export const CRITIQUE_DROP_CONTRACT =
  process.env.NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT || "";
```

If contract address is empty, frontend should run mock mode if enabled.

---

## 16. Environment variables

Create:

```txt
.env.example
```

Include:

```env
NEXT_PUBLIC_ARC_RPC_URL=
NEXT_PUBLIC_ARC_CHAIN_ID=
NEXT_PUBLIC_ARC_EXPLORER_URL=
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT=
NEXT_PUBLIC_ENABLE_MOCK_MODE=true
PRIVATE_KEY=
```

Do not put real private keys in the repo.

---

## 17. Local/mock storage

Create:

```txt
lib/storage.ts
```

Use local storage for MVP.

Types:

```ts
export type BountyMetadata = {
  id: string;
  contractBountyId?: string;
  founderAddress?: string;
  title: string;
  productUrl: string;
  instructions: string;
  rewardUSDC: string;
  maxSubmissions: number;
  deadline: string;
  status: "draft" | "open" | "closed" | "expired";
  createdAt: string;
  txHashes: string[];
};
```

```ts
export type FeedbackSubmission = {
  id: string;
  bountyId: string;
  testerWallet: string;
  confusedAnswer: string;
  understoodAnswer: string;
  signupAnswer: string;
  proofLink?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  submissionHash: string;
  payoutTxHash?: string;
  createdAt: string;
};
```

Functions:

```ts
createLocalBounty()
getLocalBounty()
listLocalBounties()
updateLocalBounty()
addSubmission()
listSubmissions()
approveLocalSubmission()
rejectLocalSubmission()
addTxHashToBounty()
```

Keep this layer isolated so it can later be replaced with Supabase.

---

## 18. Hashing

Create:

```txt
lib/hash.ts
```

Create deterministic submission hash from:

- bounty ID
- tester wallet
- three answers
- proof link if present
- submission ID

Use Viem or ethers hashing utilities.

The hash is what gets passed to the contract.

Full feedback remains off-chain.

---

## 19. USDC helpers

Create:

```txt
lib/usdc.ts
```

Add helpers:

```ts
parseUSDC(value: string): bigint
formatUSDC(value: bigint): string
```

USDC has 6 decimals unless Arc Docs MCP says otherwise for the specific token used.

Do not use floating point math for contract values.

---

## 20. Wallet and contract integration

Use Wagmi + Viem.

The app must show:

- Connect wallet button
- Connected wallet address
- Wrong network warning
- Contract not configured warning
- USDC not configured warning
- Mock mode warning when enabled

Contract write actions:

- create bounty
- approve USDC if needed
- fund bounty
- approve submission
- refund unused funds
- close bounty

Contract read actions:

- get bounty
- remaining funds

If a real contract is not configured, app should still demo the flow in mock mode.

---

## 21. Deployment script

Create:

```txt
scripts/deploy.ts
```

Script must:

1. Read `NEXT_PUBLIC_USDC_ADDRESS` or `USDC_ADDRESS` from env.
2. Deploy `CritiqueDropBounty`.
3. Print deployed contract address.
4. Print exact env line:

```txt
NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT=0x...
```

Hardhat config must include Arc testnet using values from env.

Do not hardcode private keys.

---

## 22. UI design

Use Tailwind CSS.

Design should be:

- clean
- simple
- serious
- founder-tool style
- not crypto-casino style
- no unnecessary animations
- no 3D graphics
- no social feed

Use cards, badges, short copy, and clear buttons.

Good button labels:

- Create Feedback Bounty
- Fund with USDC
- Copy Bounty Link
- Submit Feedback
- Approve and Pay
- Reject
- View Dashboard
- Refund Unused Funds

Bad language to avoid:

- Decentralized human intelligence marketplace
- Sybil-resistant social graph
- Feedback economy protocol
- Web3 growth intelligence layer

Use normal human words.

---

## 23. Demo data

Seed or provide a demo bounty:

Title:

```txt
Test my landing page
```

Product URL:

```txt
https://example.com
```

Instructions:

```txt
Spend 3 minutes on this page. Tell me what confused you, what you understood clearly, and whether you would click the main call-to-action.
```

Reward:

```txt
1 USDC
```

Slots:

```txt
5
```

Deadline:

```txt
24 hours from creation
```

---

## 24. README requirements

Create:

```txt
README.md
```

Must include:

### What is CritiqueDrop?

Short paragraph.

### Demo flow

1. Create bounty.
2. Fund bounty with USDC.
3. Share public link.
4. Tester submits feedback.
5. Founder approves.
6. Tester gets paid.
7. Dashboard shows receipt.

### Install

```bash
npm install
```

### Run locally

```bash
cp .env.example .env.local
npm run dev
```

### Compile contract

```bash
npx hardhat compile
```

### Run tests

```bash
npx hardhat test
```

### Deploy contract

```bash
npx hardhat run scripts/deploy.ts --network arcTestnet
```

### Configure after deploy

```env
NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT=0x...
```

### Important notes

- Feedback text is stored off-chain/local.
- Contract only handles bounty funding and payouts.
- Verify Arc values through Arc Docs MCP.
- This is MVP code, not audited production code.

---

## 25. Package scripts

Ensure package.json includes:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:arc": "hardhat run scripts/deploy.ts --network arcTestnet"
  }
}
```

---

## 26. Build order

Follow this order:

1. Check Arc Docs MCP access.
2. Verify Arc docs values.
3. Create `docs-verification.md`.
4. Set up project structure.
5. Install dependencies.
6. Set up Next.js, TypeScript, Tailwind.
7. Set up Hardhat.
8. Write `MockUSDC.sol`.
9. Write `CritiqueDropBounty.sol`.
10. Write contract tests.
11. Run contract tests.
12. Fix contract/test errors.
13. Write Arc/env config.
14. Write storage layer.
15. Write hash and USDC helper functions.
16. Build reusable components.
17. Build pages.
18. Add wallet connection.
19. Add contract interaction functions.
20. Add mock mode.
21. Add README.
22. Run lint/build/tests.
23. Fix errors.
24. Final self-check.

---

## 27. Must-check before final response

Do not finish until these are true or explicitly documented as blocked.

### Arc docs checks

- Arc Docs MCP was used.
- Arc values were verified or marked as placeholders.
- `docs-verification.md` exists.

### Product checks

- Home page works.
- Create bounty page works.
- Public bounty page works.
- Tester can submit feedback.
- Review page shows submissions.
- Founder can approve/reject.
- Dashboard shows stats and receipts.

### Contract checks

- Contract compiles.
- Tests pass or failed tests are clearly listed.
- Founder can create/fund bounty.
- Founder can approve and pay tester.
- Non-founder cannot approve.
- Duplicate payouts are blocked.
- Refund unused funds works.

### Integration checks

- Wallet connect exists.
- Arc config exists.
- USDC config exists.
- Contract address config exists.
- Mock mode works if contract address is missing.
- Transaction hashes are displayed when available.

### Code quality checks

- No private keys committed.
- `.env.example` exists.
- README exists.
- No fake unused pages.
- TypeScript build attempted.
- Test command attempted.

---

## 28. Final response format

When finished, respond with:

1. What was built.
2. Commands you ran.
3. Test/build results.
4. Arc docs values verified.
5. Placeholder values the user must fill.
6. How to run the demo.
7. Known limitations.

Do not say “done” unless tests/build were attempted.

---

## 29. Acceptable MVP limitations

Allowed:

- Local storage instead of database
- Mock mode for frontend demo
- Manual founder approval
- No tester login
- No reputation
- No AI scoring
- No marketplace discovery
- No production audit

Not allowed:

- No smart contract
- No payout function
- No feedback form
- No review page
- No dashboard
- No tests
- No README
