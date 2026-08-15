-- Phase 2: Customer Data Engine
-- Apply with Supabase CLI: supabase db reset / supabase migration up

-- ---------------------------------------------------------------------------
-- Customers Table
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  email text not null check (char_length(trim(email)) > 0),
  phone text,
  company text,
  last_purchase_date timestamptz,
  total_purchase_amount numeric not null default 0 check (total_purchase_amount >= 0),
  purchase_count integer not null default 0 check (purchase_count >= 0),
  average_order_value numeric not null default 0 check (average_order_value >= 0),
  last_contact_date timestamptz,
  service_type text,
  customer_status text not null default 'active' check (customer_status in ('active', 'inactive', 'lost', 'churned', 'recovered')),
  consent_status boolean not null default true,
  opt_out_status boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_unique_business_email unique (business_id, email)
);

comment on table public.customers is 'Customer entity for revenue recovery analysis and campaign targeting.';

-- ---------------------------------------------------------------------------
-- Indexes for High Performance Queries
-- ---------------------------------------------------------------------------
create index if not exists customers_business_id_idx on public.customers (business_id);
create index if not exists customers_business_status_idx on public.customers (business_id, customer_status);
create index if not exists customers_business_last_purchase_idx on public.customers (business_id, last_purchase_date desc nulls last);
create index if not exists customers_business_total_amount_idx on public.customers (business_id, total_purchase_amount desc);
create index if not exists customers_business_email_idx on public.customers (business_id, email);

-- ---------------------------------------------------------------------------
-- Trigger for updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
force row level security on public.customers;

grant select, insert, update, delete on table public.customers to authenticated;

-- Select: Members of the business can view customers
drop policy if exists "customers_select_member" on public.customers;
create policy "customers_select_member"
on public.customers
for select
to authenticated
using (public.user_is_member_of(business_id));

-- Insert: Members can insert customers
drop policy if exists "customers_insert_member" on public.customers;
create policy "customers_insert_member"
on public.customers
for insert
to authenticated
with check (public.user_is_member_of(business_id));

-- Update: Members can update customer records
drop policy if exists "customers_update_member" on public.customers;
create policy "customers_update_member"
on public.customers
for update
to authenticated
using (public.user_is_member_of(business_id))
with check (public.user_is_member_of(business_id));

-- Delete: Only workspace OWNER or ADMIN can delete customer records
drop policy if exists "customers_delete_owner_admin" on public.customers;
create policy "customers_delete_owner_admin"
on public.customers
for delete
to authenticated
using (public.user_role_in_business(business_id) in ('OWNER', 'ADMIN'));
