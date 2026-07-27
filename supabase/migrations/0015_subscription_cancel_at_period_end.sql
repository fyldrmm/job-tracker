-- Stripe's Customer Portal cancel flow defaults to "cancel at period end":
-- status stays 'active' and current_period_end is unchanged, so nothing in
-- the existing columns distinguished a subscription that will renew from
-- one that's scheduled to lapse. Surfaces as `cancel_at_period_end` on the
-- Stripe Subscription object (customer.subscription.updated).
alter table subscriptions
  add column cancel_at_period_end boolean not null default false;
