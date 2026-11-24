-- Row level security: who can see and change what.
-- Roles: platform staff (super_admin, implementation) sit above all shops;
-- owner and staff work inside one shop; sales_rep sees only their own orders.

-- Helpers live in the private schema (not exposed through the API) and run
-- as security definer so policies can read memberships without recursion.
create or replace function private.is_platform_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_staff where user_id = (select auth.uid()));
$$;

create or replace function private.role_in(org uuid) returns public.member_role
language sql stable security definer set search_path = '' as $$
  select role from public.memberships
  where user_id = (select auth.uid()) and organization_id = org;
$$;

create or replace function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
                 where user_id = (select auth.uid()) and organization_id = org);
$$;

create or replace function private.is_shop_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
                 where user_id = (select auth.uid()) and organization_id = org
                   and role in ('owner', 'staff'));
$$;

create or replace function private.is_owner(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
                 where user_id = (select auth.uid()) and organization_id = org
                   and role = 'owner');
$$;

create or replace function private.my_contact_id(org uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select contact_id from public.memberships
  where user_id = (select auth.uid()) and organization_id = org and role = 'sales_rep';
$$;

create or replace function private.my_customer_id(org uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select c.customer_id from public.memberships m
  join public.contacts c on c.id = m.contact_id
  where m.user_id = (select auth.uid()) and m.organization_id = org and m.role = 'sales_rep';
$$;

create or replace function private.can_see_profile(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select target = (select auth.uid())
      or exists (select 1 from public.platform_staff where user_id = (select auth.uid()))
      or exists (
        select 1 from public.memberships me
        join public.memberships them on them.organization_id = me.organization_id
        where me.user_id = (select auth.uid()) and me.role in ('owner', 'staff')
          and them.user_id = target
      );
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

alter table public.organizations enable row level security;
alter table public.shop_rules enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_staff enable row level security;
alter table public.customer_groups enable row level security;
alter table public.customers enable row level security;
alter table public.contacts enable row level security;
alter table public.memberships enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.capacity_days enable row level security;
alter table public.slot_holds enable row level security;

-- organizations: members read their shop; only platform staff change it (theme)
create policy organizations_select on public.organizations for select to authenticated
  using (private.is_member(id) or private.is_platform_staff());
create policy organizations_update on public.organizations for update to authenticated
  using (private.is_platform_staff()) with check (private.is_platform_staff());

-- shop_rules: every member reads (reps need rush rules); owners edit
create policy shop_rules_select on public.shop_rules for select to authenticated
  using (private.is_member(organization_id) or private.is_platform_staff());
create policy shop_rules_update on public.shop_rules for update to authenticated
  using (private.is_owner(organization_id) or private.is_platform_staff())
  with check (private.is_owner(organization_id) or private.is_platform_staff());

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (private.can_see_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- platform_staff: you can see your own row only
create policy platform_staff_select on public.platform_staff for select to authenticated
  using (user_id = (select auth.uid()));

-- customer_groups: shop people
create policy customer_groups_select on public.customer_groups for select to authenticated
  using (private.is_shop_member(organization_id) or private.is_platform_staff());
create policy customer_groups_write on public.customer_groups for all to authenticated
  using (private.is_owner(organization_id)) with check (private.is_owner(organization_id));

-- customers: shop people see all; a rep sees only their own dealer
create policy customers_select on public.customers for select to authenticated
  using (private.is_shop_member(organization_id) or private.is_platform_staff()
         or id = private.my_customer_id(organization_id));
create policy customers_write on public.customers for all to authenticated
  using (private.is_owner(organization_id)) with check (private.is_owner(organization_id));

-- contacts: shop people see all; a rep sees only themselves
create policy contacts_select on public.contacts for select to authenticated
  using (private.is_shop_member(organization_id) or private.is_platform_staff()
         or id = private.my_contact_id(organization_id));
create policy contacts_write on public.contacts for all to authenticated
  using (private.is_owner(organization_id)) with check (private.is_owner(organization_id));

-- memberships: your own rows; owners see their shop's team
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_owner(organization_id)
         or private.is_platform_staff());

-- orders: shop people see all; a rep sees only orders where they are the contact
create policy orders_select on public.orders for select to authenticated
  using (private.is_shop_member(organization_id) or private.is_platform_staff()
         or contact_id = private.my_contact_id(organization_id));
create policy orders_insert on public.orders for insert to authenticated
  with check (private.is_owner(organization_id));
create policy orders_update on public.orders for update to authenticated
  using (private.is_shop_member(organization_id))
  with check (private.is_shop_member(organization_id));

-- order_items: same visibility as their order
create policy order_items_select on public.order_items for select to authenticated
  using (
    private.is_shop_member(organization_id) or private.is_platform_staff()
    or exists (select 1 from public.orders o
               where o.id = order_items.order_id
                 and o.contact_id = private.my_contact_id(o.organization_id))
  );
create policy order_items_write on public.order_items for all to authenticated
  using (private.is_shop_member(organization_id))
  with check (private.is_shop_member(organization_id));

-- order_events: reps see the rep-visible events on their own orders
create policy order_events_select on public.order_events for select to authenticated
  using (
    private.is_shop_member(organization_id) or private.is_platform_staff()
    or (visible_to_rep and exists (
          select 1 from public.orders o
          where o.id = order_events.order_id
            and o.contact_id = private.my_contact_id(o.organization_id)))
  );
create policy order_events_insert on public.order_events for insert to authenticated
  with check (private.is_shop_member(organization_id) and actor_id = (select auth.uid()));

-- capacity_days: every member reads (no customer data here); owners set them
create policy capacity_days_select on public.capacity_days for select to authenticated
  using (private.is_member(organization_id) or private.is_platform_staff());
create policy capacity_days_write on public.capacity_days for all to authenticated
  using (private.is_owner(organization_id)) with check (private.is_owner(organization_id));

-- slot_holds: reps create and see their own; shop people see and manage all
create policy slot_holds_select on public.slot_holds for select to authenticated
  using (private.is_shop_member(organization_id) or private.is_platform_staff()
         or contact_id = private.my_contact_id(organization_id));
create policy slot_holds_insert on public.slot_holds for insert to authenticated
  with check (contact_id = private.my_contact_id(organization_id)
              and created_by = (select auth.uid()));
create policy slot_holds_update on public.slot_holds for update to authenticated
  using (private.is_shop_member(organization_id)
         or contact_id = private.my_contact_id(organization_id))
  with check (private.is_shop_member(organization_id)
              or contact_id = private.my_contact_id(organization_id));

-- Rush spots used in a week, across all dealers. Reps can't read other
-- dealers' orders, so this returns only a count, and only to members.
create or replace function public.rush_spots_used(org uuid, week_start date) returns int
language sql stable security definer set search_path = '' as $$
  select case when not private.is_member(org) then 0 else (
    (select count(*) from public.orders o
      where o.organization_id = org and o.is_rush
        and o.in_hands_date >= week_start and o.in_hands_date < week_start + 7)
    + (select count(*) from public.slot_holds h
      where h.organization_id = org and h.is_rush and h.status in ('held', 'confirmed')
        and h.expires_at > now()
        and h.in_hands_date >= week_start and h.in_hands_date < week_start + 7)
  )::int end;
$$;
revoke all on function public.rush_spots_used(uuid, date) from public, anon;
grant execute on function public.rush_spots_used(uuid, date) to authenticated;
