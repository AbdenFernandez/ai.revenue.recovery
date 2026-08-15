-- Phase 1: Authentication, Multi-Tenancy, Subscriptions, and Customer Preferences
-- Apply with Supabase CLI: supabase db reset / supabase migration up

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Businesses (Tenants)
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (char_length(trim(slug)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.businesses is 'Tenant root entity representing a business/workspace.';

-- ---------------------------------------------------------------------------
-- 2. User Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (char_length(trim(email)) > 0),
  full_name text,
  default_business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is 'Application user profile mapped 1:1 to auth.users.';

-- ---------------------------------------------------------------------------
-- 3. Business Memberships (Multi-Tenant RBAC)
-- ---------------------------------------------------------------------------
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_members_unique_user unique (business_id, user_id)
);

create index if not exists business_members_business_id_idx on public.business_members (business_id);
create index if not exists business_members_user_id_idx on public.business_members (user_id);

comment on table public.business_members is 'Mapping of users to businesses with role-based permissions (OWNER, ADMIN, MEMBER).';

-- ---------------------------------------------------------------------------
-- 4. Subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'starter', 'growth', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_start timestamptz not null default timezone('utc', now()),
  current_period_end timestamptz not null default timezone('utc', now() + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_business_id_idx on public.subscriptions (business_id);

comment on table public.subscriptions is 'Business subscription tier and billing status.';

-- ---------------------------------------------------------------------------
-- 5. Customer Preferences & Recovery Settings
-- ---------------------------------------------------------------------------
create table if not exists public.customer_preferences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  currency text not null default 'USD' check (char_length(currency) = 3),
  timezone text not null default 'UTC',
  inactivity_threshold_days integer not null default 60 check (inactivity_threshold_days >= 7 and inactivity_threshold_days <= 365),
  recovery_rate_target numeric not null default 0.15 check (recovery_rate_target >= 0.01 and recovery_rate_target <= 1.0),
  ai_tone_preference text not null default 'professional' check (ai_tone_preference in ('professional', 'friendly', 'urgent', 'empathetic')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customer_preferences_business_id_idx on public.customer_preferences (business_id);

comment on table public.customer_preferences is 'Tenant-specific customer recovery configuration and AI tone preferences.';

-- ---------------------------------------------------------------------------
-- Triggers for updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at
before update on public.business_members
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists customer_preferences_set_updated_at on public.customer_preferences;
create trigger customer_preferences_set_updated_at
before update on public.customer_preferences
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper Functions for Multi-Tenant RLS
-- ---------------------------------------------------------------------------
create or replace function public.user_is_member_of(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = target_business_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.user_role_in_business(target_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.business_members
  where business_id = target_business_id
    and user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.user_is_member_of(uuid) from public;
grant execute on function public.user_is_member_of(uuid) to authenticated;

revoke all on function public.user_role_in_business(uuid) from public;
grant execute on function public.user_role_in_business(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.customer_preferences enable row level security;

force row level security on public.businesses;
force row level security on public.profiles;
force row level security on public.business_members;
force row level security on public.subscriptions;
force row level security on public.customer_preferences;

-- Privileges
grant select, insert, update on table public.businesses to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.business_members to authenticated;
grant select, update on table public.subscriptions to authenticated;
grant select, insert, update on table public.customer_preferences to authenticated;

-- 1. Businesses Policies
drop policy if exists "businesses_select_member" on public.businesses;
create policy "businesses_select_member"
on public.businesses
for select
to authenticated
using (public.user_is_member_of(id));

drop policy if exists "businesses_insert_authenticated" on public.businesses;
create policy "businesses_insert_authenticated"
on public.businesses
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "businesses_update_owner_admin" on public.businesses;
create policy "businesses_update_owner_admin"
on public.businesses
for update
to authenticated
using (public.user_role_in_business(id) in ('OWNER', 'ADMIN'))
with check (public.user_role_in_business(id) in ('OWNER', 'ADMIN'));

-- 2. Profiles Policies
drop policy if exists "profiles_select_self_or_colleagues" on public.profiles;
create policy "profiles_select_self_or_colleagues"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.business_members my_bm
    inner join public.business_members their_bm on my_bm.business_id = their_bm.business_id
    where my_bm.user_id = auth.uid()
      and their_bm.user_id = public.profiles.id
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3. Business Members Policies
drop policy if exists "members_select_colleagues" on public.business_members;
create policy "members_select_colleagues"
on public.business_members
for select
to authenticated
using (public.user_is_member_of(business_id));

drop policy if exists "members_insert_owner_admin_or_self_create" on public.business_members;
create policy "members_insert_owner_admin_or_self_create"
on public.business_members
for insert
to authenticated
with check (
  public.user_role_in_business(business_id) in ('OWNER', 'ADMIN')
  or user_id = auth.uid()
);

drop policy if exists "members_update_owner" on public.business_members;
create policy "members_update_owner"
on public.business_members
for update
to authenticated
using (public.user_role_in_business(business_id) = 'OWNER')
with check (public.user_role_in_business(business_id) = 'OWNER');

drop policy if exists "members_delete_owner_or_self" on public.business_members;
create policy "members_delete_owner_or_self"
on public.business_members
for delete
to authenticated
using (
  public.user_role_in_business(business_id) = 'OWNER'
  or (user_id = auth.uid() and public.user_role_in_business(business_id) != 'OWNER')
);

-- 4. Subscriptions Policies
drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member"
on public.subscriptions
for select
to authenticated
using (public.user_is_member_of(business_id));

drop policy if exists "subscriptions_update_owner" on public.subscriptions;
create policy "subscriptions_update_owner"
on public.subscriptions
for update
to authenticated
using (public.user_role_in_business(business_id) = 'OWNER')
with check (public.user_role_in_business(business_id) = 'OWNER');

-- 5. Customer Preferences Policies
drop policy if exists "preferences_select_member" on public.customer_preferences;
create policy "preferences_select_member"
on public.customer_preferences
for select
to authenticated
using (public.user_is_member_of(business_id));

drop policy if exists "preferences_update_owner_admin" on public.customer_preferences;
create policy "preferences_update_owner_admin"
on public.customer_preferences
for update
to authenticated
using (public.user_role_in_business(business_id) in ('OWNER', 'ADMIN'))
with check (public.user_role_in_business(business_id) in ('OWNER', 'ADMIN'));
