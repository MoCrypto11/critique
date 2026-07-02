-- Feedback campaigns (CritiqueCampaignEscrowV1 companion tables).
-- New tables only — the existing bounties/submissions tables are untouched,
-- so this migration is fully backward compatible with the bounty flow.
--
-- RLS posture matches the existing app model (client-side anon key; see
-- SECURITY.md for the documented limitation and the server-side hardening
-- plan): campaigns and tasks are public listings, submissions are inserted
-- by anonymous contributors, and the app performs founder gating client-side.

create table if not exists public.campaigns (
  id text primary key,
  chain_campaign_id text,
  founder_address text,
  allowed_agent_address text,
  title text not null,
  product_url text not null default '',
  goal text not null default '',
  instructions text,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  spam_rules text,
  total_budget text not null default '0',
  max_reward_per_task text not null default '0',
  deadline timestamptz not null,
  approval_mode text not null default 'founder',
  auto_pay_enabled boolean not null default false,
  dispute_window integer not null default 86400,
  require_proof boolean not null default true,
  status text not null default 'open',
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_tasks (
  id text primary key,
  campaign_id text not null references public.campaigns (id),
  chain_task_id text,
  title text not null,
  category text,
  reward text not null default '0',
  max_payouts integer not null default 1,
  criteria jsonb not null default '[]'::jsonb,
  required_proof jsonb not null default '[]'::jsonb,
  expected_deliverable text,
  ai_reason text,
  creator_type text not null default 'founder',
  status text not null default 'draft',
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_submissions (
  id text primary key,
  campaign_id text not null references public.campaigns (id),
  task_id text not null references public.campaign_tasks (id),
  contributor_wallet text not null,
  content text not null,
  proof_url text,
  submission_hash text not null,
  status text not null default 'pending',
  ai_summary text,
  ai_quality_score integer,
  ai_criteria_match text,
  ai_spam_risk text,
  ai_duplicate_risk text,
  ai_suggested_action text,
  ai_reason text,
  evaluation_hash text,
  rejection_reason text,
  payout_tx_hash text,
  queued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campaign_tasks_campaign_idx on public.campaign_tasks (campaign_id);
create index if not exists campaign_submissions_campaign_idx on public.campaign_submissions (campaign_id);
create index if not exists campaign_submissions_task_idx on public.campaign_submissions (task_id);
-- One submission per contributor per task (mirrors the bounty duplicate rule).
create unique index if not exists campaign_submissions_unique_wallet_per_task
  on public.campaign_submissions (task_id, lower(contributor_wallet));

alter table public.campaigns enable row level security;
alter table public.campaign_tasks enable row level security;
alter table public.campaign_submissions enable row level security;

create policy "campaigns are publicly readable"
  on public.campaigns for select to anon, authenticated using (true);
create policy "campaigns can be created"
  on public.campaigns for insert to anon, authenticated with check (true);
create policy "campaigns can be updated"
  on public.campaigns for update to anon, authenticated using (true);

create policy "campaign tasks are publicly readable"
  on public.campaign_tasks for select to anon, authenticated using (true);
create policy "campaign tasks can be created"
  on public.campaign_tasks for insert to anon, authenticated with check (true);
create policy "campaign tasks can be updated"
  on public.campaign_tasks for update to anon, authenticated using (true);
create policy "campaign tasks can be deleted"
  on public.campaign_tasks for delete to anon, authenticated using (true);

create policy "campaign submissions are publicly readable"
  on public.campaign_submissions for select to anon, authenticated using (true);
create policy "anyone can submit campaign feedback"
  on public.campaign_submissions for insert to anon, authenticated with check (true);
create policy "campaign submissions can be updated"
  on public.campaign_submissions for update to anon, authenticated using (true);
