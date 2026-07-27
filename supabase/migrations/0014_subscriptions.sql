-- Pro-tier billing state (monetization-mvp-brief.md §5). One row per user,
-- created either by the Stripe webhook handler (real subscribers) or by
-- hand via the Supabase SQL editor (comp accounts) -- never by the browser
-- client, which is why every write-capable policy is absent here on purpose:
-- there are none. The only client-facing operation is reading your own row.

create type subscription_status as enum ('active', 'canceled', 'past_due', 'none');
create type subscription_plan as enum ('monthly', 'quarterly', 'none');
create type subscription_currency as enum ('usd', 'eur', 'none');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status subscription_status not null default 'none',
  plan subscription_plan not null default 'none',
  -- Which Price the subscriber is actually on, so a future price change for
  -- new signups can't accidentally get read back onto an existing grandfathered
  -- subscriber when reasoning about their rate (monetization-mvp-brief.md §2).
  currency subscription_currency not null default 'none',
  current_period_end timestamptz,
  -- Unlimited Pro, bypasses Stripe entirely -- set by hand for the owner's
  -- own account and any comp accounts (monetization-mvp-brief.md §3). Kept
  -- outside the billing system on purpose: nothing here to accidentally
  -- bill, refund, or leak via a coupon code.
  is_comp_account boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_user_id_idx on subscriptions (user_id);

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row
  execute function set_updated_at();

alter table subscriptions enable row level security;

-- Read-only from the browser. All writes go through the webhook handler
-- (checkout.session.completed / customer.subscription.updated / .deleted)
-- using the service-role key, same pattern as extraction_events -- or
-- through the Supabase SQL editor for is_comp_account. No insert/update/
-- delete policy exists for anon/authenticated, which is the enforcement:
-- with RLS enabled and no matching policy, those operations are simply
-- denied, not merely discouraged.
create policy "subscriptions_select_own"
  on subscriptions for select
  using (auth.uid() = user_id);
