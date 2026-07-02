# Security model & Supabase RLS

This document describes Critique's access-control model, the **Supabase
Row-Level Security (RLS)** policies it relies on, and a known limitation that
must be closed before treating submission feedback as fully private.

## Architecture (important)

Critique is a **client-side** app. The browser talks to Supabase directly using
the **public anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). There is no
server-side session, and a wallet address is **not** a Supabase auth identity.

Consequences:

- The **anon key is public** by design (it ships in the client bundle). That is
  expected — it is safe **only when RLS is enabled** on every table.
- **No service-role key is used in client code.** Never set a service-role key
  as a `NEXT_PUBLIC_*` variable.
- Because the founder reads submissions with the **same anon key** as everyone
  else, RLS alone cannot say "only the founder may read this bounty's
  submissions" — there is no authenticated identity to check against. See
  [Known limitation](#known-limitation--founder-only-reads).

## Defense layers in this app

1. **Client route guards (this codebase).** The founder pages
   `/bounty/[id]/review`, `/bounty/[id]/review/[submissionId]`, and
   `/bounty/[id]/dashboard` now require a connected wallet that matches
   `bounty.founderAddress`. If it does not, the page shows a "Connect founder
   wallet" / "not the founder" gate and **does not fetch or render any
   submission data**. This stops casual access by URL.
2. **Content-free public fetch.** The public bounty page uses
   `listSubmissionSummaries()`, which selects only `status`, `feedback_type`,
   `expected_reward_usdc`, and `created_at` — never the off-chain feedback
   answer columns and **not** contributor wallet addresses. Feedback content
   and contributor wallets are never sent to public visitors by the app.
3. **Supabase RLS (must be enabled in your project).** This is the real
   enforcement boundary — see below.

> Layers 1–2 are necessary but **not sufficient** on their own: a determined
> user holding the public anon key can still query Supabase directly. RLS is
> what actually enforces access.

## Required RLS policies

Enable RLS on both tables and apply policies. Minimum viable policy set:

```sql
alter table public.bounties   enable row level security;
alter table public.submissions enable row level security;

-- Bounties are public listings: anyone may read them.
create policy "bounties are publicly readable"
  on public.bounties for select
  to anon, authenticated
  using (true);

-- Contributors (anon) may submit feedback.
create policy "anyone can submit feedback"
  on public.submissions for insert
  to anon, authenticated
  with check (true);
```

Duplicate-submission prevention (the app no longer checks this client-side,
because doing so required fetching contributors' wallets to the public page).
**Apply this index** so a wallet cannot submit twice to the same bounty:

```sql
create unique index if not exists submissions_unique_wallet_per_bounty
  on public.submissions (bounty_id, lower(tester_wallet));
```

### Optional: Arc memo columns

If you enable Arc transaction memos (`NEXT_PUBLIC_ENABLE_ARC_MEMOS=true`), apply
this migration so approved submissions can store their memo reference. Until it
is applied, memo writes fail silently (best-effort) and the payout is
unaffected:

```sql
alter table public.submissions
  add column if not exists memo_id     text,
  add column if not exists memo_tx_hash text,
  add column if not exists memo_status  text;
```

### Campaign tables (beta)

The feedback-campaign tables (`campaigns`, `campaign_tasks`,
`campaign_submissions` — see `supabase/migrations/20260702_campaigns.sql`)
follow the same client-side anon-key posture and share the same known
limitation below. The money-side guarantees for campaigns do NOT depend on
Supabase: budgets, payout limits, the allowed agent, dispute windows, and
refunds are enforced by the `CritiqueCampaignEscrowV1` contract on-chain.

## Known limitation — founder-only reads

**Goal:** only a bounty's founder should read that bounty's submission feedback.

**Why RLS alone can't do it today:** the founder's browser reads submissions
with the anon key, so Supabase sees an anonymous request with no proof that the
caller controls `founderAddress`. If you simply `deny anon SELECT` on
`submissions`, you also break the founder's own review screen.

**Recommended fix (server-side authenticated read):**

1. Add a server-only `SUPABASE_SERVICE_ROLE_KEY` (NOT `NEXT_PUBLIC_*`) to the
   deployment environment.
2. Add a Next.js Route Handler (e.g. `app/api/founder/submissions/route.ts`)
   that:
   - accepts `{ bountyId, address, message, signature }`,
   - verifies the signature recovers `address` (viem `verifyMessage`) and that
     `message` is fresh (timestamp/nonce, anti-replay),
   - loads the bounty with the service-role client and checks
     `address === bounty.founderAddress`,
   - returns submissions only on success.
3. Point the founder pages at that route (the founder signs a message once to
   view), and then **deny anon `SELECT` on `submissions`** via RLS:

```sql
-- ONLY after founder reads are moved server-side (service role).
-- This makes submissions write-only for the public.
-- (No anon select policy = anon cannot read submissions.)
revoke select on public.submissions from anon;
```

Until that server-side read path exists, treat submission feedback as
**readable by anyone with the anon key**, and do not store anything in
submissions that must remain private from a determined reader.

## Reporting

Found a security issue? Please open a private report to the maintainer rather
than a public issue.
