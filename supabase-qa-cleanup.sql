-- QA-only cleanup for Critique smoke-test data.
-- Run the SELECT statements first. Only run the DELETE transaction if every row is clearly QA/test data.
-- This intentionally does not touch on-chain bounties or any non-QA production data.

select id, title, contract_bounty_id, created_at
from public.bounties
where title like 'QA DO NOT USE%'
order by created_at desc;

select id, bounty_id, status, feedback_type, tester_context, first_impression, created_at
from public.submissions
where bounty_id in (
    select id
    from public.bounties
    where title like 'QA DO NOT USE%'
  )
  or tester_context like 'QA LOAD TEST%'
  or first_impression like 'QA LOAD TEST%'
  or id like 'qa-sub-%'
  or id like 'qa-load-%'
  or id like 'qa-schema-check-%'
order by created_at desc;

begin;

delete from public.submissions
where bounty_id in (
    select id
    from public.bounties
    where title like 'QA DO NOT USE%'
  )
  or tester_context like 'QA LOAD TEST%'
  or first_impression like 'QA LOAD TEST%'
  or id like 'qa-sub-%'
  or id like 'qa-load-%'
  or id like 'qa-schema-check-%';

delete from public.bounties
where title like 'QA DO NOT USE%';

commit;

notify pgrst, 'reload schema';
