-- Phase 0: foundational multi-tenant schema
-- Apply with Supabase CLI: supabase db reset / supabase migration up

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenants (businesses)
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (char_length(trim(slug)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.businesses is 'Tenant root entity. All tenant-scoped data references businesses.id.';

-- ---------------------------------------------------------------------------
-- User profiles (maps Supabase auth.users to a business)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_business_id_idx on public.profiles (business_id);

comment on table public.profiles is 'Application user profile with tenant membership.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on table public.businesses from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;

grant select on table public.businesses to authenticated;
grant select, update on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;

force row level security on public.businesses;
force row level security on public.profiles;

-- Helper: current user's business_id
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_business_id() from public;
grant execute on function public.current_business_id() to authenticated;

-- Businesses: users can read their own tenant only
drop policy if exists "businesses_select_own" on public.businesses;
create policy "businesses_select_own"
on public.businesses
for select
to authenticated
using (id = public.current_business_id());

-- Profiles: users can read profiles in their business
drop policy if exists "profiles_select_same_business" on public.profiles;
create policy "profiles_select_same_business"
on public.profiles
for select
to authenticated
using (business_id = public.current_business_id());

-- Profiles: users can read their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Profiles: users can update safe fields on their own profile only.
-- business_id and role are immutable via RLS (prevents tenant hopping and privilege escalation).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and business_id = (
    select p.business_id
    from public.profiles as p
    where p.id = auth.uid()
  )
  and role = (
    select p.role
    from public.profiles as p
    where p.id = auth.uid()
  )
);

-- Service role bypasses RLS by default in Supabase.
-- Additional write policies for onboarding will be added in the auth phase.
