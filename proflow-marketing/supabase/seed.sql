-- Seed data for local dev / first-test environments.
--
-- The owner user is not created here because Supabase auth.users rows must
-- be created via the Auth API (or the dashboard's "Add user"). To seed:
--
--   1. Create a user in Supabase Dashboard > Authentication > Users with
--      email aqib@proflow.example. Note the resulting UUID.
--   2. Replace the placeholder OWNER UUID below
--      (00000000-0000-0000-0000-000000000001) with that real UUID using
--      find-and-replace, then run this file (psql or the SQL editor).
--
-- All non-user UUIDs are stable so you can re-run this script safely
-- (every insert uses ON CONFLICT).

-- Organization ------------------------------------------------------------

insert into public.organizations (id, name, brand_primary, brand_accent)
values
  ('00000000-0000-0000-0000-000000000010',
   'ProFlow Marketing', '#0F172A', '#2563EB')
on conflict (id) do update set name = excluded.name;

-- Owner membership (auth.users row must already exist) --------------------

insert into public.org_members
  (org_id, user_id, role, email, full_name, is_active)
values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'owner', 'aqib@proflow.example', 'Aqib Sohail', true)
on conflict (org_id, user_id) do update
  set role = excluded.role,
      full_name = excluded.full_name,
      email = excluded.email;

-- Agency payment methods (Day 20 defaults) --------------------------------

insert into public.agency_payment_methods
  (org_id, wise_enabled, wise_details, default_currency,
   method_order, recommended_method)
values
  ('00000000-0000-0000-0000-000000000010', true,
   jsonb_build_object(
     'account_holder', 'Aqib Sohail',
     'usd_account_number', '9600000123456',
     'routing_ach', '084009519',
     'swift', 'TRWIUS35XXX',
     'bank_name_address', 'Wise US Inc., 30 W 26th Street, New York, NY',
     'payment_link', 'wise.com/pay/aqibsohail'
   ),
   'USD', array['wise','bank','payoneer'], 'wise')
on conflict (org_id) do nothing;

-- Sample clients ---------------------------------------------------------

insert into public.clients
  (id, org_id, name, industry, brand_primary, brand_accent,
   plan_name, monthly_fee, status, billing_email, primary_contact)
values
  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000010',
   'Acme Solar', 'Renewable Energy',
   '#16A34A', '#0EA5E9', 'Growth Package', 1500, 'active',
   'billing@acmesolar.example', 'Jane Cooper'),
  ('00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000010',
   'Bluefield Energy', 'Renewable Energy',
   '#1E40AF', '#38BDF8', 'Starter Package', 900, 'active',
   'ap@bluefield.example', 'Marcus Lee')
on conflict (id) do update
  set name = excluded.name,
      industry = excluded.industry,
      plan_name = excluded.plan_name,
      monthly_fee = excluded.monthly_fee;

-- Client platforms -------------------------------------------------------

insert into public.client_platforms (client_id, platform, handle, monthly_quota)
values
  ('00000000-0000-0000-0000-000000000101', 'instagram', '@acmesolar', 12),
  ('00000000-0000-0000-0000-000000000101', 'tiktok',    '@acmesolar', 8),
  ('00000000-0000-0000-0000-000000000101', 'linkedin',  'acme-solar', 6),
  ('00000000-0000-0000-0000-000000000102', 'instagram', '@bluefield_energy', 8),
  ('00000000-0000-0000-0000-000000000102', 'linkedin',  'bluefield-energy', 4)
on conflict (client_id, platform) do update
  set handle = excluded.handle,
      monthly_quota = excluded.monthly_quota;

-- Brand guidelines stubs ------------------------------------------------

insert into public.brand_guidelines (client_id, about, target_audience, voice_tone)
values
  ('00000000-0000-0000-0000-000000000101',
   'Acme Solar installs residential solar in the US Southwest.',
   'Homeowners 35-65 in AZ, NV, NM who want to lower their electric bills.',
   'Helpful, plainspoken, never preachy.'),
  ('00000000-0000-0000-0000-000000000102',
   'Bluefield Energy is a B2B renewables consultancy.',
   'Mid-market manufacturing CFOs evaluating onsite generation.',
   'Authoritative, data-led, calm.')
on conflict (client_id) do nothing;
