-- Reps can't edit orders directly (row level security). These two functions
-- let a rep approve, or ask for changes to, a proof on their own order only.

create or replace function public.approve_proof(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.contact_id is distinct from private.my_contact_id(o.organization_id) then
    raise exception 'That order is not yours' using errcode = '42501';
  end if;
  if o.stage <> 'proof_sent' then
    raise exception 'This proof is not waiting for approval' using errcode = '22023';
  end if;

  update public.orders set stage = 'approved' where id = p_order;
  insert into public.order_events (organization_id, order_id, actor_id, message)
  values (
    o.organization_id, o.id, (select auth.uid()),
    'Proof approved by ' || coalesce((select full_name from public.contacts where id = o.contact_id), 'the rep')
  );
end $$;

create or replace function public.request_proof_changes(p_order uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  note text := left(trim(coalesce(p_note, '')), 500);
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.contact_id is distinct from private.my_contact_id(o.organization_id) then
    raise exception 'That order is not yours' using errcode = '42501';
  end if;
  if o.stage <> 'proof_sent' then
    raise exception 'This proof is not waiting for changes' using errcode = '22023';
  end if;
  if note = '' then
    raise exception 'Describe the change you need' using errcode = '22023';
  end if;

  insert into public.order_events (organization_id, order_id, actor_id, message)
  values (
    o.organization_id, o.id, (select auth.uid()),
    coalesce((select full_name from public.contacts where id = o.contact_id), 'The rep')
      || ' asked for changes: ' || note
  );
end $$;

revoke all on function public.approve_proof(uuid) from public, anon;
revoke all on function public.request_proof_changes(uuid, text) from public, anon;
grant execute on function public.approve_proof(uuid) to authenticated;
grant execute on function public.request_proof_changes(uuid, text) to authenticated;
