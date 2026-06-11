# Critique — Launch QA / Stress-Test Report

- **Date:** 2026-06-11
- **Production domain tested:** https://usecritique.xyz (HTTP 200, served by Vercel, no redirect away from the apex domain)
- **Local project:** D:\CritiqueDrop
- **Network:** Arc Testnet only (chain id `5042002`, RPC `https://rpc.testnet.arc.network`). Mainnet not used. Mock mode disabled (`NEXT_PUBLIC_ENABLE_MOCK_MODE=false`).

---

## 0. Scope note — what this pass could and could not do

This pass is a **full automated + static stress audit**: build, lint, contract test suite,
route health on a real production server, production-domain checks, and a line-by-line audit
of every product flow (create → submit → review → approve/payout → dashboards → wallet states).

**Not executed here (requires your wallet and a funded Arc testnet account):** creating the 3
on-chain bounties, the 8 live submissions against a Supabase-backed bounty, real approve→payout
transactions, and multi-browser testing with live data. These need MetaMask popups, which must
not be bypassed. The exact manual steps and what to approve are listed in
**Section 9 — Manual test checklist (you must run)**.

The reason the live data flows can't be exercised locally: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
**absent from local `.env.local`**, so the local app falls back to `localStorage` and never
talks to Supabase. Production presumably has the key set in Vercel (the live site builds and
serves). See the **risk** in Section 8.

---

## 1. Commands run

| Command | Result |
|---|---|
| `npm run build` | ✅ Compiled successfully, 8 routes generated, no type errors |
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm test` (`hardhat test`) | ✅ **25/25 passing** (contract logic — see Section 5) |
| `npm run start` + route probes | ✅ All product routes HTTP 200 (see Section 3) |

---

## 2. Environment & config checks

| Check | Result |
|---|---|
| `.env.local` present | ✅ |
| `.env.local` gitignored | ✅ `git check-ignore` = ignored |
| `.env.local` tracked by git | ✅ NOT tracked (safe — will not be committed) |
| Arc chain id | ✅ `5042002` |
| Arc RPC | ✅ `https://rpc.testnet.arc.network` |
| Arc explorer | ✅ `https://testnet.arcscan.app` |
| Mock mode | ✅ `false` (real testnet path) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` in local `.env.local` | ⚠️ **MISSING locally** (see Section 8 risk) |
| Stale `critique-drop-nine.vercel.app` references | ✅ None found in source |
| Hardcoded production domain references | ✅ None — bounty links built from `window.location.origin` (portable) |
| Production HSTS header | ✅ `Strict-Transport-Security: max-age=63072000` |
| `/debug/supabase` exposed in production | ✅ Returns **404** in production (debug tooling not publicly reachable) |

No private keys, service-role keys, or secret values were printed, modified, or committed.

---

## 3. Route health (local production server)

| Route | Status | Notes |
|---|---|---|
| `/` | 200 | Hero + "Create a bounty" + "Feedback bounties" render |
| `/create` | 200 | Bounty form renders |
| `/dashboard` | 200 | Connect-wallet state renders |
| `/bounty/demo` | 200 | Demo bounty renders (local-only by design) |
| `/bounty/not-real-id` | 200 | Renders clean **"Bounty not found"** client state — no crash, no error digest |
| `/bounty/not-real-id/review` | 200 | Clean not-found state |
| `/bounty/not-real-id/dashboard` | 200 | Clean not-found state |
| `/debug/supabase` | 404 (local & prod) | Not part of product flow; harmless that it's inaccessible |

No raw stack traces, JSON dumps, "application error", or white screens on any route.

---

## 4. Flow-by-flow audit (static)

### Header / navigation
- Header container width aligned to hero column (`max-w-7xl`, same padding) — earlier fix verified.
- `AppHeader` has no border/shadow/sticky; nav wraps to its own row on mobile; wallet stays right-aligned with `whitespace-nowrap` (no overflow).

### Wallet UI states — `components/WalletConnect.tsx`
Exactly **one** control per state, no stacked boxes:
- Disconnected → single "Connect wallet" button.
- Connected + wrong network → single "Switch to Arc" button (adds Arc chain via `wallet_addEthereumChain` if missing — code 4902 handled).
- Connected + Arc → single wallet pill with dropdown (Copy address / Disconnect).
- Dropdown a11y: `aria-haspopup`, `aria-expanded`, `role="menu"/"menuitem"`, closes on Escape and outside-click.
- Wallet error messages are humanised (`getWalletErrorMessage`): rejected → "Transaction cancelled."; wrong chain → "Switch to Arc Testnet to continue."; low balance → "Not enough USDC…".

### Create bounty — `components/BountyForm.tsx`
Validation blocks before any transaction: empty title, invalid URL (`isValidUrl` http/https), no feedback type, reward ≤ 0, slots < 1 / non-integer, past deadline, disconnected wallet, wrong network, unconfigured contract.
Safety highlights:
- **`ensureSharedDatabaseReachable()` runs BEFORE any wallet tx** → a Supabase outage cannot produce a paid-but-unsaved bounty.
- USDC balance pre-check ("Not enough USDC balance").
- `simulateContract` before the real create/fund tx catches reverts early.
- Orphaned-bounty edge case (on-chain success + DB save failure) shows the tx hash for support recovery.
- Submit button `disabled={isSubmitting || !canCreateBounty}` → double-click safe.

### Public submission — `app/bounty/[id]/page.tsx`
- **No wallet required to submit** (as intended); payout address validated by `looksLikeAddress` (`0x` + 40 hex).
- Bounty + submissions load from Supabase (`getLocalBounty` / `listSubmissions`) → not localStorage-only → works cross-browser.
- Per-type required-field validation for written / video / technical formats.
- Blocks submission when bounty is full / expired / closed.
- Same payout wallet cannot submit twice (client-side guard).
- **BUG FOUND & FIXED:** submit button previously had no in-flight guard (`disabled={status !== "open"}` only). A rapid double-click could fire `onSubmit` twice against stale state → duplicate submissions. Fixed (see Section 6).

### Founder review — `app/bounty/[id]/review/page.tsx`
- Approve/Reject buttons render **only** while `status === "pending"` → an already-approved/rejected item has no action button (no duplicate-approve via UI).
- In-flight approve guarded by `busyId` (`disabled={busy}`).
- Per-feedback-type funded-slot check before approval.
- Founder-mismatch guard before approval; on-chain contract is the hard gate.
- Pending / Approved / Rejected counts derived live from the submission list.

### Dashboards
- `app/bounty/[id]/dashboard/page.tsx`: funding, approved/pending/rejected, slots, receipts, tx hashes — all derived from the same `listSubmissions` source as the review page, so **counts stay consistent** across review and dashboard. Close/Refund gated by founder + deadline/closed state.
- `app/dashboard/page.tsx`: Created vs Contributions tabs; `loadDashboard` **clears all state when wallet is absent** and re-runs on address change → **no stale data after disconnect or wallet switch**.

### FAQ
- Real `<button aria-expanded>` accordion — keyboard operable (Enter/Space), chevron `aria-hidden`.

---

## 5. Smart-contract test suite (read-only, contracts untouched)

`npm test` → **25/25 passing**. Payment-critical guarantees confirmed on-chain:
- ✅ same tester cannot be paid twice (per bounty)
- ✅ same submission hash cannot be reused
- ✅ non-founder cannot approve or refund
- ✅ cannot approve beyond max submissions / per-type slots
- ✅ cannot approve without enough funded balance
- ✅ rejects zero reward / zero slots / past deadline at creation
- ✅ founder can close and refund unused funds (after close or deadline)

**Implication:** the duplicate-payout concern is backstopped at the contract layer — a repeat
`approveSubmission` with the same hash/tester reverts, and the review UI surfaces it as a
human-readable error rather than paying twice.

---

## 6. Bugs found & fixed

| # | Severity | Area | Finding | Fix |
|---|---|---|---|---|
| 1 | **Medium (launch-relevant)** | Public feedback form | Submit button lacked an in-flight guard; rapid double-click could create duplicate submissions for the same wallet (validation re-checked stale state). | Added `isSubmitting` state, `if (isSubmitting) return;` re-entrancy guard, `disabled={status !== "open" \|\| isSubmitting}`, "Submitting…" label, reset in `finally`. `app/bounty/[id]/page.tsx`. Frontend-only; no product/contract/schema change. |

No other launch blockers found. No contract, Supabase schema, payment-logic, route, or
production-domain changes were made.

---

## 7. Responsive & accessibility (static review)

Reviewed Tailwind breakpoints and markup across homepage, create, dashboard, public bounty,
review, and bounty dashboard. No overflow risks found:
- Multi-column grids collapse to single column on mobile (`lg:grid-cols-[…]`).
- Long addresses/URLs use `break-all`; public-bounty grid uses `minmax(0,1fr)` to prevent blowout.
- Hero headline uses `clamp()`; wallet pill uses `whitespace-nowrap`.
- All buttons are real `<button>`, all nav is real `<Link>/<a>`, every input has a `<label>`,
  focus styles via `.focus-ring` / `focus-within:ring-2`, tap targets `min-h-11` (44px).

Pixel testing at 320/375/390/430/768/1024/1280/1440 on a real browser/devtools remains a
**manual** step (Section 9), but no code-level overflow issues were identified.

---

## 8. Remaining risks

| Risk | Severity | Recommendation |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing from local `.env.local` | Medium (local), Unknown (prod) | **Confirm the anon key is set in Vercel project env** (Production + Preview). Add it to local `.env.local` to enable local Supabase testing. Without it, local builds silently fall back to `localStorage`. |
| Duplicate payout-wallet submission across simultaneous sessions | Low | The duplicate-wallet check is client-side. Two different browsers submitting the same wallet at the same instant could both pass. A DB unique constraint on `(bounty_id, lower(tester_wallet))` would close this, but that is a **schema change** — left untouched per instructions; flagged for your decision. |
| Live Supabase prod connectivity not exercised by this pass | Low | Verify via the manual create flow in Section 9 (a created bounty that opens in incognito proves Supabase persistence). |
| Reject uses `window.prompt` | Cosmetic | Functional and keyboard-accessible; consider an inline field later. Not a blocker. |

---

## 9. Manual test checklist (you must run — needs your wallet)

Run these on https://usecritique.xyz with a wallet holding Arc testnet USDC. **Pause at each
wallet popup; approve only what you intend.** Create test bounties titled exactly:
`QA Normal Bounty - Delete Later`, `QA Low Reward Bounty - Delete Later`,
`QA Edge Case Bounty - Delete Later`.

1. **Create (×3).** `/create`. For each, expect: USDC `approve` popup (first time / when allowance is low) → `createAndFundBounty` popup. After confirmation you should land on `/bounty/<id>`. Record each bounty link.
2. **Submit (≥8) to the normal bounty.** Open its link in a normal window — **no wallet prompt should appear to submit**. Vary feedback types and content length (short / long / special chars / line breaks / URLs). Try a double-click on Submit → should produce only **one** submission (fix #1).
3. **Cross-browser.** Open the same bounty link in incognito / another browser → bounty + slots load (proves Supabase, not localStorage). Submit there → it must appear in founder review.
4. **Review.** `/bounty/<id>/review` as the founder wallet. Approve 2 (each triggers an `approveSubmission` payout popup — approve in wallet), reject 2 (enter a reason), leave the rest pending. Confirm: approved items lose their buttons, payout tx hash links to Arcscan, rejected stay rejected after refresh.
5. **Counts.** `/bounty/<id>/dashboard` → Approved/Pending/Rejected must match step 4 (e.g. 2/≥4/2). Refresh → counts persist.
6. **Wallet states.** Disconnect → clean state, no stale address. Switch to a wrong network → single "Switch to Arc". Switch back. Reconnect a different wallet → dashboard shows that wallet's data only.
7. **Responsive.** DevTools at 320/375/390/430/768/1024/1280/1440 on the six pages → no horizontal scroll, wallet header intact, forms usable.

Record the 3 bounty IDs/links here after creation so they can be cleaned up later:
- Normal: `__________`
- Low reward: `__________`
- Edge case: `__________`

---

## 10. Launch readiness verdict

### ✅ Ready with minor risks

- Build, lint, and the full 25-test contract suite pass; all routes healthy; production domain,
  HTTPS/HSTS, and config are correct; no stale references; wallet UI and every flow are sound on
  audit; one real double-submit bug was found and fixed.
- Before flipping the switch, close the two items that this pass could not self-verify:
  1. **Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel** (and Supabase reachable in prod).
  2. **Run the Section 9 manual wallet/payout checklist once end-to-end** on Arc testnet.

With those two confirmed, Critique is launch-ready.
