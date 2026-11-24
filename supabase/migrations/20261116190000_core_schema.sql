-- PressBoard core schema (milestone 1)
-- Multi-tenant: every shop-owned row carries organization_id.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.member_role as enum ('owner', 'staff', 'sales_rep');
create type public.platform_role as enum ('super_admin', 'implementation');
create type public.order_stage as enum (
  'review', 'proof_sent', 'approved', 'scheduled', 'on_press',
  'finishing', 'packed', 'shipped', 'invoiced', 'paid'
);
create type public.day_status as enum ('open', 'limited', 'full', 'closed');
create type public.hold_status as enum ('held', 'confirmed', 'released', 'expired');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  time_zone text not null default 'America/New_York',
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Rules the owner controls (separate from organizations so owners can edit
-- these without being able to edit the white-label theme).
create table public.shop_rules (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  daily_capacity int not null default 5 check (daily_capacity between 0 and 100),
  turnaround_days int not null default 8 check (turnaround_days between 1 and 60),
  rush_min_days int not null default 3 check (rush_min_days between 0 and 60),
  rush_fee_pct int not null default 25 check (rush_fee_pct between 0 and 200),
  rush_per_week int not null default 2 check (rush_per_week between 0 and 50),
  rush_max_pieces int not null default 100 check (rush_max_pieces > 0),
  hold_hours int not null default 48 check (hold_hours between 1 and 336),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now()
);

create table public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null
);
create index customer_groups_org_idx on public.customer_groups (organization_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid references public.customer_groups(id) on delete set null,
  name text not null,
  short_name text not null,
  city text,
  state text,
  created_at timestamptz not null default now()
);
create index customers_org_idx on public.customers (organization_id);
create index customers_group_idx on public.customers (group_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index contacts_org_idx on public.contacts (organization_id);
create index contacts_customer_idx on public.contacts (customer_id);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.member_role not null,
  contact_id uuid references public.contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id),
  -- a sales rep is always tied to their dealer contact; shop people never are
  constraint memberships_rep_contact check ((role = 'sales_rep') = (contact_id is not null))
);
create index memberships_org_idx on public.memberships (organization_id);
create index memberships_contact_idx on public.memberships (contact_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number int not null,
  customer_id uuid not null references public.customers(id),
  contact_id uuid references public.contacts(id) on delete set null,
  end_client text not null,
  dealer_po text,
  stage public.order_stage not null default 'review',
  is_rush boolean not null default false,
  in_hands_date date,
  press_date date,
  garment_hex text,
  ink_hex text,
  color_label text,
  total_pieces int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index orders_org_stage_idx on public.orders (organization_id, stage);
create index orders_org_press_idx on public.orders (organization_id, press_date);
create index orders_contact_idx on public.orders (contact_id);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  position int not null default 0,
  description text not null,
  decoration text,
  sizes jsonb not null default '{}'::jsonb,
  quantity int not null default 0
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_org_idx on public.order_items (organization_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  message text not null,
  visible_to_rep boolean not null default true,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at desc);
create index order_events_org_idx on public.order_events (organization_id);
create index order_events_actor_idx on public.order_events (actor_id);

create table public.capacity_days (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  day date not null,
  status public.day_status not null default 'open',
  note text,
  primary key (organization_id, day)
);

create table public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  in_hands_date date not null,
  pieces int not null check (pieces > 0),
  decoration text,
  is_rush boolean not null default false,
  status public.hold_status not null default 'held',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index slot_holds_org_day_idx on public.slot_holds (organization_id, in_hands_date);
create index slot_holds_contact_idx on public.slot_holds (contact_id);
create index slot_holds_created_by_idx on public.slot_holds (created_by);

-- Keep updated_at fresh on orders and rules
create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on public.orders
  for each row execute function private.touch_updated_at();
create trigger shop_rules_touch before update on public.shop_rules
  for each row execute function private.touch_updated_at();

-- A profile row for every new auth user
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Working-day arithmetic used by seeds and scheduling (Mon-Fri)
create or replace function private.add_working_days(d date, n int) returns date
language plpgsql immutable set search_path = '' as $$
declare
  r date := d;
  i int := 0;
  step int := case when n < 0 then -1 else 1 end;
begin
  if n = 0 then
    while extract(isodow from r) > 5 loop r := r + 1; end loop;
    return r;
  end if;
  while i < abs(n) loop
    r := r + step;
    if extract(isodow from r) <= 5 then i := i + 1; end if;
  end loop;
  return r;
end $$;
