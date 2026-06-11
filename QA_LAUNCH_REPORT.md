# Critique — Launch QA / Stress-Test Report (v2, real workflow data)

- **Date:** 2026-06-11
- **Production URL tested:** https://usecritique.xyz (HTTP 200, Vercel, HSTS present)
- **Local env tested:** D:\CritiqueDrop on Arc Testnet (chain id `5042002`, RPC `rpc.testnet.arc.network`)
- **Network:** Arc Testnet only. Mainnet not used. Mock mode off.
- **Founder/test wallet:** `0x0D9E6a5104770B65417C7B90dfa40f1E677E687A`

> This run executed the **real on-chain + real Supabase workflow** using a local harness
> (`scripts/qa/stress.mjs`) that calls the **same contract functions with the same arguments**
> the UI builds (`BountyForm` / review page) and writes through the **same Supabase column
> mapping** as `lib/storage.ts`. It hits the **same Supabase project** the live site uses
> (URL confirmed identical to the production bundle). The private key is read from env and is
> **never printed, logged, or committed**.
>
> **Honest limitation:** this drives the actual backend + payment path, but not the literal
> MetaMask-in-browser click path (no wallet extension to automate). Browser-only checks
> (invalid-form UX, wallet popups, pixel-level responsive, keyboard a11y) are covered by code
> review + the contract suite and flagged as manual where DOM is required.

---

## 1. Private-key safety — PASS

| Check | Result |
|---|---|
| `.env.local` exists | ✅ |
| `.env.local` gitignored + untracked | ✅ |
| Private key only in `hardhat.config.ts` (server-side) | ✅ never in app/frontend code |
| `NEXT_PUBLIC_PRIVATE_KEY` / public PK var | ✅ none exist |
| Private key in client bundle | ✅ impossible (only `NEXT_PUBLIC_*` is inlined) |
| Key printed/logged by harness | ✅ never (env-only) |
| `.env.qa.local` (recovered public anon key) | ✅ gitignored, value never printed |

## 2. Production Supabase config — PASS (launch-critical)

Confirmed by scanning the production client bundle:
- ✅ Supabase URL **and** an `anon`-role JWT are present in production JS → **Vercel production
  has `NEXT_PUBLIC_SUPABASE_ANON_KEY` set; production does NOT fall back to localStorage**.
- ✅ Production Supabase URL (`ptzjyuwrjjsvyptuwffn.supabase.co`) **matches** local
  `NEXT_PUBLIC_SUPABASE_URL` → local tests exercise the same DB the live site uses.
- ⚠️ Local `.env.local` still lacks the anon key; recovered the **public** key into
  `.env.qa.local` (gitignored) for local testing. *Recommend adding it to `.env.local` too.*
- ✅ Real bounties/submissions persist through Supabase and are readable cross-session (Section 10).

## 3. Technical baseline — PASS

| Command | Result |
|---|---|
| `npm run build` | ✅ success, 8 routes |
| `npm run lint` | ✅ no warnings/errors |
| `npm test` (hardhat) | ✅ **25/25 passing** |

## 4. Bounties created (real, on-chain + Supabase)

| Title | App ID (public link) | Contract ID | Funded | Create tx |
|---|---|---|---|---|
| QA Normal Bounty - Delete Later | `bounty-mq9okm2r-6fh35q` | 4 | 2.5 USDC | `0x134e129f…ae0bcc` |
| QA Low Reward Bounty - Delete Later | `bounty-mq9oktl6-hwx81s` | 5 | 0.1 USDC | `0x0f7e456b…9819c6` |
| QA Edge Case Bounty - Delete Later | `bounty-mq9ol0xz-d87eoy` | 6 | 0.5 USDC | `0xf09477ed…57bd467` |

Public links (resolve 200 on production):
- https://usecritique.xyz/bounty/bounty-mq9okm2r-6fh35q
- https://usecritique.xyz/bounty/bounty-mq9oktl6-hwx81s
- https://usecritique.xyz/bounty/bounty-mq9ol0xz-d87eoy

Each: on-chain `createAndFundBounty` succeeded (USDC `approve` → simulate → create → `BountyCreated`
event parsed for contract id) **and** saved to Supabase with correct `founder_address`. Edge bounty
used special characters in the product URL and a line break in instructions — saved cleanly.

## 5. Submissions (10 to the normal bounty)

10 submissions inserted via the real storage mapping, all `bounty_id = bounty-mq9okm2r-6fh35q`:
- Types: **6 written, 2 deep product review, 1 technical proposal, 1 video walkthrough**.
- Content variety: short, very long (×20/×60 repeats), line breaks, embedded URL, special/unicode
  chars (`<>&"'` + emoji), harsh-but-valid critique, duplicate-like, realistic.
- Verified: all linked to same `bounty_id`; every row has a valid `tester_wallet` (EVM regex) and
  `submission_hash` (bytes32). No double-insert occurred.

## 6. Invalid-input handling

Live form-level invalid submissions (empty fields, bad URL, bad payout address, double-click) are a
**browser-DOM** concern not exercised by the data harness. Covered by:
- Static validation review (prior pass): `looksLikeAddress`, per-type required-field checks,
  full/expired/closed guards, same-wallet duplicate guard.
- **Bug fixed previously this engagement:** public submit button now has an `isSubmitting`
  re-entrancy guard (no duplicate submission from double-click) — `app/bounty/[id]/page.tsx`.
- Remaining manual check: visually confirm inline error copy in a browser (Section "Manual").

## 7. Founder review / approve / reject / payout — PASS

- **Approved 3** (3 distinct written submissions, 3 distinct testers) — each a real on-chain
  `approveSubmission` payout, hash saved to Supabase `payout_tx_hash`:

  | Submission | Payout tx (Arcscan: `testnet.arcscan.app/tx/<hash>`) |
  |---|---|
  | `submission-mq9ol8d9-9tk02w` | `0x8d0bcb1fa9e4b6bd803f4df16b686e19776fab17e10b835aef21b1b919a66f84` |
  | `submission-mq9ol8kj-cznz98` | `0xbf7c37c7b3cdad14033479b63522836605e24cd496b3c9c297e67b07a8593f3c` |
  | `submission-mq9ol8ng-0mwahp` | `0x509cc967f641fbb0776ed51c6053b026f072955ac5ea62ad9ec7b2b6b19fa409` |

- **Rejected 2** with reason saved (`submission-mq9ol8q7-rx24g3`, `submission-mq9ol8sw-6ovyp4`).
- **Duplicate payout BLOCKED:** re-approving an already-approved submission **reverted on-chain**
  (`approveSubmission reverted`). No double payout is possible.
- **Non-founder cannot approve:** enforced on-chain (contract test ✅) and in the review UI guard.
- Approve/reject UI is in-flight guarded (`busyId`/`disabled`) and buttons disappear once a
  submission leaves `pending` (no duplicate mutation via UI).

## 8 & 9. Dashboard counts — PASS

Counts read back from a **fresh Supabase client** for the normal bounty:

| Metric | Value | Expected |
|---|---|---|
| Total submissions | 10 | 10 |
| Approved | 3 | 3 |
| Rejected | 2 | 2 |
| Pending | 5 | 5 |

Both the review page and bounty dashboard derive counts from this same `listSubmissions` source,
so the displayed numbers match the DB. (Visual render of the founder-gated `/review` and
`/dashboard` requires a wallet login — documented as manual; the data they read is verified here.)

## 10. Cross-session / cross-browser persistence — PASS (critical)

A brand-new Supabase client (no shared state, no localStorage — equivalent to a different
browser/incognito) retrieved the bounty and **all 10 submissions** by `bounty_id`. This proves data
is server-side and the public link works outside the creating session. Production public bounty
routes return 200 for all three real IDs.

## 11. Supabase persistence proof (field-level)

Read back via the public anon key (the same path the browser uses):
- ✅ 3 bounty rows; correct `founder_address`, `status=open`, sane `created_at`, `tx_hashes` saved.
- ✅ 10 submission rows; all correct `bounty_id`; valid `tester_wallet` + `submission_hash`.
- ✅ Approved rows all have `payout_tx_hash`; rejected rows all have `rejection_reason`.
- ✅ All four feedback types present.
- No service-role/secret key used or exposed (anon key only).

## 12. Edge routes — PASS

`/bounty/not-real-id` (+ `/review`, `/dashboard`) return a clean "Bounty not found" state (HTTP 200,
no crash, no stack trace, no JSON dump). `/debug/supabase` is **404 in production** (not exposed).

## 13. Responsive (static review — manual DOM pending)

Code review across the six pages found no overflow risks (`break-all` on addresses/URLs,
`minmax(0,1fr)` grids, `clamp()` headline, `whitespace-nowrap` wallet pill, single-column collapse).
No headless browser is installed here, so pixel testing at 320/375/390/430/768/1024/1280/1440 remains
a **manual devtools** step.

## 14. Console / network / secrets

- ✅ Private key not in client bundle (verified); only the **public** anon key ships (by design, RLS-protected).
- ✅ No repeated-request/reconnect loops in the data layer; storage calls are one-shot per action.
- Browser console/network panel review remains a **manual** step (needs a browser session).

## 15. Wallet / network states (static — manual DOM pending)

`WalletConnect` returns exactly one control per state (disconnected / wrong-network / connected),
clears state on disconnect, and re-loads on address change (no stale data). Live MetaMask
connect/switch/reject needs the browser and is in the manual checklist.

## Bugs found / fixed

| # | Severity | Status | Note |
|---|---|---|---|
| 1 | Medium | **Fixed (committed)** | Public feedback form lacked an in-flight guard → double-click could duplicate a submission. Added `isSubmitting` guard. |

No new launch blockers surfaced in this live run. No contract, schema, payment-logic, route, or
domain changes were made.

## Remaining risks

| Risk | Severity | Action |
|---|---|---|
| Local `.env.local` lacks the Supabase anon key | Low (prod OK) | Add it to `.env.local` (prod already has it in Vercel). |
| Concurrent same-wallet submissions across sessions | Low | Client-side duplicate check only; a DB unique index on `(bounty_id, lower(tester_wallet))` would close it — a **schema change**, left for your decision. |
| Founder-gated `/review` `/dashboard` visual DOM not auto-verified | Low | Data verified; do one manual wallet login (below). |

## Manual checklist (browser + wallet — the few items DOM-only)

1. Connect the founder wallet on https://usecritique.xyz, open `/dashboard` → the 3 QA bounties appear under Created.
2. Open `/bounty/bounty-mq9okm2r-6fh35q/review` → 10 cards, 3 approved (payout receipts link to Arcscan), 2 rejected, 5 pending; refresh → persists.
3. In incognito, open a bounty link and submit feedback (no wallet prompt); double-click Submit → only one row.
4. Wallet states: wrong network → single "Switch to Arc"; disconnect → no stale address.
5. DevTools responsive sweep at the listed widths; watch console for errors.

## Test-data cleanup (delete after review)

Supabase rows to remove when done (founder `0x0D9E…687A`):
- Bounties: `bounty-mq9okm2r-6fh35q`, `bounty-mq9oktl6-hwx81s`, `bounty-mq9ol0xz-d87eoy`
- Submissions: 10 rows where `bounty_id = bounty-mq9okm2r-6fh35q`
- On-chain bounties (contract ids 4/5/6) can be closed + `refundUnused` from the founder dashboard to reclaim unspent testnet USDC.

USDC spent this run: **3.135422** (40.954194 → 37.818772; funding + gas; payouts drew from funded amounts).

---

## Final verdict: ✅ Ready with minor risks

Real end-to-end workflow now verified on Arc testnet + production Supabase: **3 bounties created &
funded, 10 submissions, 3 on-chain payouts, 2 rejections, duplicate payout blocked, counts exact,
cross-session persistence proven.** Build, lint, and the 25-test contract suite pass; production is
correctly wired to Supabase with HSTS and no exposed debug route.

Before launch, close the two low-risk items: (1) add the anon key to local `.env.local` for parity,
and (2) run the short manual wallet/DOM checklist once. Everything testable without a browser wallet
is green.
