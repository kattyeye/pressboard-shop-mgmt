-- When an order shipped, was invoiced and was paid. These back the Orders
-- history (paid by month, invoices waiting on payment) and the QuickBooks sync
-- in milestone 3, which will set them from QuickBooks' own dates.

alter table public.orders
  add column shipped_at timestamptz,
  add column invoiced_at timestamptz,
  add column paid_at timestamptz;

create index orders_org_paid_idx on public.orders (organization_id, paid_at desc);
create index orders_org_invoiced_idx on public.orders (organization_id, invoiced_at);

-- Stamp the dates whenever the stage changes, wherever the change comes from
-- (shop screens, the rep proof functions, a later sync). Moving back past a
-- stage clears its date. A date set in the same statement wins over now().
create or replace function private.stamp_order_dates() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.stage is not distinct from old.stage then
      return new;
    end if;
  end if;
  new.shipped_at  := case when new.stage >= 'shipped'  then coalesce(new.shipped_at, now()) end;
  new.invoiced_at := case when new.stage >= 'invoiced' then coalesce(new.invoiced_at, now()) end;
  new.paid_at     := case when new.stage >= 'paid'     then coalesce(new.paid_at, now()) end;
  return new;
end $$;

create trigger orders_stamp_dates before insert or update of stage on public.orders
  for each row execute function private.stamp_order_dates();

-- Existing orders: take the dates from their history, else the last update.
update public.orders o set
  shipped_at = case when o.stage >= 'shipped' then coalesce(
    (select min(e.created_at) from public.order_events e where e.order_id = o.id and e.message like 'Shipped%'),
    o.updated_at) end,
  invoiced_at = case when o.stage >= 'invoiced' then coalesce(
    (select min(e.created_at) from public.order_events e where e.order_id = o.id and e.message like 'Invoice sent%'),
    o.updated_at) end,
  paid_at = case when o.stage >= 'paid' then coalesce(
    (select min(e.created_at) from public.order_events e where e.order_id = o.id and e.message like 'Payment received%'),
    o.updated_at) end
where o.stage >= 'shipped';
