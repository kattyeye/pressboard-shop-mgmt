-- Demo shop: Go For Effect, its Alli Sports dealers, sample orders and a
-- capacity calendar. Dates are relative to the day this runs, so the demo
-- looks current. Safe to run twice: it stops if the demo shop exists.
do $$
declare
  org uuid; grp uuid;
  ft uuid; bk uuid; jl uuid; mw uuid;
  c_dana uuid; c_jordan uuid; c_marcus uuid; c_alexis uuid; c_cody uuid;
  t date := (now() at time zone 'America/New_York')::date;
  d date; k int; st public.day_status;
begin
  if exists (select 1 from public.organizations where slug = 'go-for-effect') then
    raise notice 'Demo shop already exists, nothing to do';
    return;
  end if;

  insert into public.organizations (name, slug, theme)
  values ('Go For Effect', 'go-for-effect', jsonb_build_object(
    'brand', '#EE9B00', 'second', '#005F73', 'ink', '#001219', 'background', '#F7F2E2',
    'soft', '#9EC2CA', 'warm', '#BB3E03', 'highlight', '#FAE3B8'))
  returning id into org;
  insert into public.shop_rules (organization_id) values (org);

  insert into public.customer_groups (organization_id, name) values (org, 'Alli Sports Group') returning id into grp;
  insert into public.customers (organization_id, group_id, name, short_name, city, state)
    values (org, grp, 'First Team Sports Center', 'First Team', 'Greenville', 'SC') returning id into ft;
  insert into public.customers (organization_id, group_id, name, short_name, city, state)
    values (org, grp, 'Baker''s Sporting Goods', 'Baker''s', 'Jacksonville', 'FL') returning id into bk;
  insert into public.customers (organization_id, group_id, name, short_name, city, state)
    values (org, grp, 'Johnson-Lambe Co.', 'Johnson-Lambe', 'Raleigh', 'NC') returning id into jl;
  insert into public.customers (organization_id, group_id, name, short_name, city, state)
    values (org, grp, 'Midwest Sporting Goods', 'Midwest', 'Tulsa', 'OK') returning id into mw;

  insert into public.contacts (organization_id, customer_id, full_name, email) values (org, ft, 'Dana Whitfield', 'dana@example.com') returning id into c_dana;
  insert into public.contacts (organization_id, customer_id, full_name, email) values (org, ft, 'Jordan Hayes', 'jordan@example.com') returning id into c_jordan;
  insert into public.contacts (organization_id, customer_id, full_name, email) values (org, bk, 'Marcus Lee', 'marcus@example.com') returning id into c_marcus;
  insert into public.contacts (organization_id, customer_id, full_name, email) values (org, jl, 'Alexis Park', 'alexis@example.com') returning id into c_alexis;
  insert into public.contacts (organization_id, customer_id, full_name, email) values (org, mw, 'Cody Briggs', 'cody@example.com') returning id into c_cody;

  insert into public.orders (organization_id, number, customer_id, contact_id, end_client, dealer_po, stage, is_rush,
                             in_hands_date, press_date, garment_hex, ink_hex, color_label, total_pieces, created_at)
  values
    (org, 1049, ft, c_dana,   'Ridge View Baseball',      'FT-88213',  'review',     false, private.add_working_days(t, 12), null,                              '#1F2A44', '#FFFFFF', 'Navy garment, white print',        40,  now() - interval '2 hours'),
    (org, 1048, bk, c_marcus, 'Eastside Eagles Softball', 'BSG-20914', 'proof_sent', false, private.add_working_days(t, 10), private.add_working_days(t, 8),  '#C8102E', '#FFFFFF', 'Scarlet garment, white print',     54,  now() - interval '1 day'),
    (org, 1046, bk, c_marcus, 'Mandarin Lacrosse',        'BSG-20877', 'proof_sent', false, private.add_working_days(t, 7),  private.add_working_days(t, 5),  '#00843D', '#FFFFFF', 'Kelly green garment, white print', 60,  now() - interval '3 days'),
    (org, 1045, jl, c_alexis, 'Pine Ridge Cheer',         'JL-5530',   'proof_sent', false, private.add_working_days(t, 7),  private.add_working_days(t, 5),  '#1A1A1A', '#C5B358', 'Black garment, Vegas gold print',  24,  now() - interval '2 days'),
    (org, 1044, mw, c_cody,   'Tulsa Metro Volleyball',   'MSG-3391',  'scheduled',  false, private.add_working_days(t, 4),  private.add_working_days(t, 2),  '#1D4F91', '#FFFFFF', 'Royal blue garment, white print',  30,  now() - interval '5 days'),
    (org, 1043, ft, c_dana,   'Greer Youth Soccer',       'FT-88140',  'scheduled',  false, private.add_working_days(t, 5),  private.add_working_days(t, 3),  '#9BCBEB', '#1F2A44', 'Columbia blue garment, navy print', 120, now() - interval '6 days'),
    (org, 1041, ft, c_dana,   'Riverside Track',          'FT-88102',  'scheduled',  false, private.add_working_days(t, 6),  private.add_working_days(t, 4),  '#6D2332', '#F2B705', 'Maroon garment, gold print',       40,  now() - interval '7 days'),
    (org, 1042, ft, c_dana,   'Wade Hampton Baseball',    'FT-88090',  'on_press',   true,  private.add_working_days(t, 1),  private.add_working_days(t, 0),  '#1F2A44', '#F2B705', 'Navy garment, gold print',         48,  now() - interval '4 days'),
    (org, 1040, ft, c_jordan, 'Mauldin Football',         'FT-88051',  'finishing',  false, private.add_working_days(t, 2),  private.add_working_days(t, -1), '#1A1A1A', '#C8102E', 'Black garment, scarlet print',     72,  now() - interval '9 days'),
    (org, 1039, jl, c_alexis, 'Capital City Rugby',       'JL-5491',   'finishing',  false, private.add_working_days(t, 2),  private.add_working_days(t, -1), '#1F2A44', '#FFFFFF', 'Navy garment, white print',        28,  now() - interval '9 days'),
    (org, 1037, mw, c_cody,   'Owasso Baseball',          'MSG-3350',  'packed',     false, private.add_working_days(t, 1),  private.add_working_days(t, -2), '#C8102E', '#1F2A44', 'Scarlet garment, navy print',      54,  now() - interval '11 days'),
    (org, 1036, mw, c_cody,   'Broken Arrow Soccer',      'MSG-3322',  'shipped',    false, private.add_working_days(t, 0),  private.add_working_days(t, -3), '#00843D', '#FFFFFF', 'Kelly green garment, white print', 36,  now() - interval '12 days');
  -- Invoiced and paid orders live in demo_history.sql.

  insert into public.order_items (organization_id, order_id, position, description, decoration, sizes, quantity)
  select org, o.id, 0, x.description, x.decoration, x.sizes::jsonb, x.quantity
  from (values
    (1049, 'Performance tee, navy', 'Front: Ridge View script, white vinyl', '{"S":6,"M":10,"L":12,"XL":8,"2XL":4}', 40),
    (1048, 'Performance tee PT-210, scarlet', 'Front: Eagles script, white vinyl, 10 in. Back: names and numbers', '{"YM":2,"YL":4,"S":6,"M":8,"L":8,"XL":5,"2XL":3}', 36),
    (1046, 'Shooter shirt, kelly green', 'Front: Mandarin sticks, white DTF', '{"S":10,"M":18,"L":18,"XL":10,"2XL":4}', 60),
    (1045, 'Cheer tee, black', 'Front: Pine Ridge, Vegas gold vinyl', '{"YS":4,"YM":6,"YL":6,"S":4,"M":4}', 24),
    (1044, 'Practice jersey, royal blue', 'Front: Tulsa Metro, white vinyl. Back: numbers', '{"S":6,"M":8,"L":8,"XL":6,"2XL":2}', 30),
    (1043, 'Youth soccer jersey, Columbia blue', 'Front: Greer crest, navy DTF. Back: numbers', '{"YS":20,"YM":34,"YL":36,"S":20,"M":10}', 120),
    (1041, 'Track singlet, maroon', 'Front: Riverside, gold vinyl', '{"S":8,"M":12,"L":12,"XL":8}', 40),
    (1042, 'Baseball jersey, navy', 'Front: Wade Hampton script, gold vinyl. Back: names and numbers', '{"S":6,"M":12,"L":14,"XL":10,"2XL":6}', 48),
    (1040, 'Football practice tee, black', 'Front: Mauldin M, scarlet vinyl. Back: numbers', '{"M":12,"L":24,"XL":20,"2XL":12,"3XL":4}', 72),
    (1039, 'Rugby tee, navy', 'Front: Capital City crest, white DTF', '{"M":8,"L":10,"XL":8,"2XL":2}', 28),
    (1037, 'Baseball jersey, scarlet', 'Front: Owasso, navy vinyl. Back: numbers', '{"YL":6,"S":10,"M":14,"L":14,"XL":8,"2XL":2}', 54),
    (1036, 'Soccer jersey, kelly green', 'Front: Broken Arrow, white vinyl. Back: numbers', '{"YM":8,"YL":10,"S":10,"M":8}', 36)
  ) as x(number, description, decoration, sizes, quantity)
  join public.orders o on o.organization_id = org and o.number = x.number;

  insert into public.order_items (organization_id, order_id, position, description, decoration, sizes, quantity)
  select org, id, 1, 'Visor, scarlet', 'Front: Eagles script, white vinyl, 4 in', '{"One size":18}'::jsonb, 18
  from public.orders where organization_id = org and number = 1048;

  -- History for each order, up to the stage it has reached
  insert into public.order_events (organization_id, order_id, message, created_at)
  select org, o.id, e.message || coalesce(c.full_name, 'the rep'), least(o.created_at + e.after, now())
  from public.orders o
  left join public.contacts c on c.id = o.contact_id
  join (values
    ('review'::public.order_stage,   'Work order received from ', interval '0'),
    ('proof_sent', 'Proof version 1 sent to ', interval '1 hour'),
    ('approved',   'Proof approved by ', interval '1 day')
  ) as e(stage, message, after) on o.stage >= e.stage
  where o.organization_id = org;

  insert into public.order_events (organization_id, order_id, message, created_at)
  select org, o.id, e.message, least(o.created_at + e.after, now())
  from public.orders o
  join (values
    ('scheduled'::public.order_stage, 'Scheduled for press', interval '26 hours'),
    ('on_press',  'Production started', interval '2 days'),
    ('finishing', 'Moved to finishing', interval '2 days 4 hours'),
    ('packed',    'Packed: boxes weighed and photographed', interval '3 days'),
    ('shipped',   'Shipped by UPS Ground', interval '3 days 2 hours')
  ) as e(stage, message, after) on o.stage >= e.stage
  where o.organization_id = org;

  -- Capacity calendar: booked solid this week, opening up after Thanksgiving
  for d in select g::date from generate_series(t - 14, t + 90, interval '1 day') g loop
    continue when extract(isodow from d) > 5;
    if d <= t then
      st := 'full';
    else
      select count(*) into k from generate_series(t + 1, d, interval '1 day') g
        where extract(isodow from g) <= 5;
      st := case when k in (1, 2, 4) then 'full' when k in (3, 5) then 'limited' else 'open' end;
    end if;
    if d in (date '2026-11-26', date '2026-11-27', date '2026-12-24', date '2026-12-25', date '2026-12-31', date '2027-01-01') then
      st := 'closed';
    end if;
    insert into public.capacity_days (organization_id, day, status, note)
    values (org, d, st, case when st = 'closed' then 'Holiday' end);
  end loop;

  -- Nothing goes on press on a closed day: step back to the previous working day
  loop
    update public.orders o set press_date = private.add_working_days(o.press_date, -1)
    from public.capacity_days c
    where o.organization_id = org and c.organization_id = org
      and c.day = o.press_date and c.status = 'closed';
    exit when not found;
  end loop;

  -- In-hand dates skip closed days too (no deliveries on holidays): step forward
  loop
    update public.orders o set in_hands_date = private.add_working_days(o.in_hands_date, 1)
    from public.capacity_days c
    where o.organization_id = org and c.organization_id = org
      and c.day = o.in_hands_date and c.status = 'closed';
    exit when not found;
  end loop;

  -- Placed a few hours ago, so most of the 48-hour hold is still left to show
  insert into public.slot_holds (organization_id, contact_id, in_hands_date, pieces, decoration, is_rush, expires_at, created_at)
  values (org, c_marcus, private.add_working_days(t, 9), 48, 'Vinyl', false, now() + interval '44 hours', now() - interval '4 hours');
end $$;
