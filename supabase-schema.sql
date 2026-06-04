-- Critique MVP shared persistence schema.
-- Run this in the Supabase SQL editor for the project used by the frontend anon key.

create table if not exists bounties (
  id text primary key,
  contract_bounty_id text,
  founder_address text,
  title text,
  product_url text,
  instructions text,
  reward_usdc text,
  feedback_config jsonb not null default '[]'::jsonb,
  max_submissions integer,
  deadline timestamptz,
  status text,
  created_at timestamptz default now(),
  tx_hashes jsonb default '[]'
);

create table if not exists submissions (
  id text primary key,
  bounty_id text references bounties(id),
  tester_wallet text,
  feedback_type text,
  tester_context text,
  first_impression text,
  tried_first text,
  confusion text,
  value_clarity text,
  hesitation text,
  decision text,
  decision_reason text,
  best_improvement text,
  video_link text,
  technical_background text,
  technical_problem text,
  technical_fix text,
  expected_impact text,
  difficulty text,
  proof_link text,
  submission_hash text,
  status text,
  rejection_reason text,
  payout_tx_hash text,
  created_at timestamptz default now()
);

alter table bounties enable row level security;
alter table submissions enable row level security;

alter table public.bounties
  add column if not exists feedback_config jsonb not null default '[]'::jsonb;

alter table public.bounties
  alter column feedback_config set default '[]'::jsonb;

update public.bounties
  set feedback_config = '[]'::jsonb
  where feedback_config is null;

alter table public.bounties
  alter column feedback_config set not null;

-- MVP anon-key policies:
-- Public bounty links need public reads. Testers need public submission inserts.
-- Without auth, founder-only updates cannot be strongly enforced from the browser.
-- These update policies keep the demo founder flow working, but production should replace
-- them with authenticated founder checks before handling real public traffic.

create policy "Public read bounties"
  on bounties for select
  using (true);

create policy "MVP public insert bounties"
  on bounties for insert
  with check (true);

create policy "MVP public update bounties"
  on bounties for update
  using (true)
  with check (true);

create policy "Public insert submissions"
  on submissions for insert
  with check (true);

create policy "MVP public read submissions"
  on submissions for select
  using (true);

create policy "MVP public update submissions"
  on submissions for update
  using (true)
  with check (true);
