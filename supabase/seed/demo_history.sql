-- Past work for the demo shop: three months of invoiced and paid orders across
-- all four dealers, so the Orders page has history to show. Every date lines
-- up: received, proofed, pressed, shipped, invoiced, paid. Dates are relative
-- to the day this runs. Run after demo_data.sql, before demo_users.sql.
-- Safe to run twice: orders that already exist are skipped.
do $$
declare
  org uuid := (select id from public.organizations where slug = 'go-for-effect');
  t date := (now() at time zone 'America/New_York')::date;
  tz text := 'America/New_York';
begin
  if org is null then
    raise exception 'Run demo_data.sql first';
  end if;

  -- ago: in-hand date, in days before today. paid_after: days from invoice to
  -- payment (null = still waiting on payment).
  create temp table h on commit drop as
  with v(number, rep, end_client, po, rush, ago, paid_after, garment, ink, label, description, decoration, sizes) as (values
    (1035, 'Jordan Hayes',   'Hillcrest Wrestling',         'FT-88011',  false, 6,   null::int, '#3C3C3C', '#C8102E', 'Charcoal garment, scarlet print',  'Wrestling hoodie, charcoal',     'Front: Hillcrest Wrestling, scarlet vinyl',       '{"S":4,"M":8,"L":10,"XL":6,"2XL":4}'),
    (1034, 'Marcus Lee',     'Fleming Island Volleyball',   'BSG-20755', false, 9,   6,         '#1A1A1A', '#F2B705', 'Black garment, gold print',        'Warm-up tee, black',             'Front: Fleming Island VB, gold vinyl. Back: names', '{"YM":2,"YL":4,"S":8,"M":8,"L":6}'),
    (1033, 'Cody Briggs',    'Jenks Cross Country',         'MSG-3301',  false, 13,  null,      '#6D2332', '#FFFFFF', 'Maroon garment, white print',      'Long-sleeve tech tee, maroon',   'Front: Jenks XC, white vinyl. Sleeve: year',      '{"YM":4,"YL":6,"S":10,"M":12,"L":10,"XL":4}'),
    (1032, 'Dana Whitfield', 'Wade Hampton Softball',       'FT-87960',  false, 16,  9,         '#1F2A44', '#F2B705', 'Navy garment, gold print',         'Softball jersey, navy',          'Front: WH script, gold vinyl. Back: numbers',     '{"S":4,"M":8,"L":8,"XL":4,"2XL":2}'),
    (1031, 'Marcus Lee',     'Eastside Eagles Baseball',    'BSG-20702', false, 19,  12,        '#1F2A44', '#FFFFFF', 'Navy garment, white print',        'Baseball tee, navy',             'Front: Eagles, white vinyl',                      '{"S":8,"M":12,"L":12,"XL":8,"2XL":4}'),
    (1030, 'Alexis Park',    'Wakefield Swim & Dive',       'JL-5402',   false, 30,  null,      '#9BCBEB', '#1F2A44', 'Columbia blue garment, navy print', 'Team tee, Columbia blue',       'Front: Wakefield wave, navy DTF',                 '{"S":8,"M":12,"L":10,"XL":6}'),
    (1029, 'Cody Briggs',    'Bixby Soccer',                'MSG-3270',  false, 24,  14,        '#C8102E', '#FFFFFF', 'Scarlet garment, white print',     'Soccer jersey, scarlet',         'Front: Bixby crest, white DTF. Back: numbers',    '{"YS":6,"YM":10,"YL":12,"S":8,"M":6}'),
    (1028, 'Dana Whitfield', 'Greer Middle Football',       'FT-87902',  true,  31,  10,        '#1D4F91', '#FFFFFF', 'Royal blue garment, white print',  'Football practice tee, royal blue', 'Front: Greer Middle, white vinyl. Back: numbers', '{"YL":10,"S":16,"M":24,"L":22,"XL":16,"2XL":8}'),
    (1027, 'Alexis Park',    'Raleigh Rugby Club',          'JL-5388',   false, 33,  21,        '#00843D', '#FFFFFF', 'Kelly green garment, white print', 'Rugby polo, kelly green',        'Left chest: RRC crest, white DTF',                '{"M":6,"L":10,"XL":8,"2XL":4}'),
    (1026, 'Jordan Hayes',   'Mauldin Cheer',               'FT-87855',  false, 37,  8,         '#1A1A1A', '#C8102E', 'Black garment, scarlet print',     'Cheer tank, black',              'Front: Mauldin script, scarlet glitter vinyl',    '{"YS":4,"YM":8,"YL":6,"S":4,"M":2}'),
    (1025, 'Cody Briggs',    'Owasso Softball',             'MSG-3244',  false, 40,  15,        '#C8102E', '#1F2A44', 'Scarlet garment, navy print',      'Softball tee, scarlet',          'Front: Owasso, navy vinyl',                       '{"S":6,"M":10,"L":10,"XL":6,"2XL":2}'),
    (1024, 'Marcus Lee',     'Mandarin Lacrosse (fall)',    'BSG-20611', false, 43,  11,        '#00843D', '#FFFFFF', 'Kelly green garment, white print', 'Shooter shirt, kelly green',     'Front: Mandarin, white DTF',                      '{"S":10,"M":16,"L":18,"XL":10,"2XL":4}'),
    (1022, 'Dana Whitfield', 'Riverside Cross Country',     'FT-87790',  false, 50,  9,         '#6D2332', '#F2B705', 'Maroon garment, gold print',       'Tech tee, maroon',               'Front: Riverside XC, gold vinyl',                 '{"S":8,"M":10,"L":8,"XL":4}'),
    (1021, 'Alexis Park',    'Cary Volleyball',             'JL-5350',   false, 55,  18,        '#4B2E83', '#FFFFFF', 'Purple garment, white print',      'Warm-up tee, purple',            'Front: Cary VB, white vinyl',                     '{"YL":4,"S":8,"M":10,"L":6,"XL":2}'),
    (1019, 'Marcus Lee',     'Ponte Vedra Golf',            'BSG-20480', false, 62,  10,        '#1F2A44', '#FFFFFF', 'Navy garment, white print',        'Performance polo, navy',         'Left chest: PV Golf, white vinyl, 3.5 in',        '{"M":6,"L":8,"XL":6,"2XL":4}'),
    (1017, 'Dana Whitfield', 'Wade Hampton Baseball Camp',  'FT-87640',  false, 75,  12,        '#F2B705', '#1F2A44', 'Gold garment, navy print',         'Camp tee, gold',                 'Front: WH Baseball Camp, navy DTF',               '{"YS":10,"YM":16,"YL":14,"S":8,"M":4}'),
    (1015, 'Cody Briggs',    'Tulsa Metro Volleyball (summer)', 'MSG-3190', false, 88, 20,      '#1D4F91', '#FFFFFF', 'Royal blue garment, white print',  'Warm-up tee, royal blue',        'Front: Tulsa Metro, white vinyl',                 '{"S":6,"M":8,"L":8,"XL":4,"2XL":2}'),
    (912,  'Marcus Lee',     'Eastside Eagles Softball (spring)', 'BSG-19870', false, 250, 10,  '#C8102E', '#FFFFFF', 'Scarlet garment, white print',     'Performance tee, scarlet',       'Front: Eagles script, white vinyl',               '{"YM":2,"YL":4,"S":8,"M":12,"L":12,"XL":8,"2XL":4}')
  ),
  d as (
    select v.*, private.add_working_days(t - v.ago, 0) as in_hands,
           (select sum(value::int) from jsonb_each_text(v.sizes::jsonb))::int as qty
    from v
  ),
  s as (
    select d.*, private.add_working_days(d.in_hands, -3) as press,
           (private.add_working_days(d.in_hands, -9) + time '09:15') at time zone tz as received,
           (private.add_working_days(d.in_hands, -2) + time '15:30') at time zone tz as shipped
    from d
  )
  select s.*, s.shipped + interval '20 hours' as invoiced,
         s.shipped + interval '20 hours' + s.paid_after * interval '1 day' as paid
  from s;

  insert into public.orders (organization_id, number, customer_id, contact_id, end_client, dealer_po, stage, is_rush,
                             in_hands_date, press_date, garment_hex, ink_hex, color_label, total_pieces,
                             created_at, updated_at, shipped_at, invoiced_at, paid_at)
  select org, h.number, c.customer_id, c.id, h.end_client, h.po,
         (case when h.paid is null then 'invoiced' else 'paid' end)::public.order_stage, h.rush,
         h.in_hands, h.press, h.garment, h.ink, h.label, h.qty,
         h.received, coalesce(h.paid, h.invoiced), h.shipped, h.invoiced, h.paid
  from h
  join public.contacts c on c.organization_id = org and c.full_name = h.rep
  on conflict (organization_id, number) do nothing;

  insert into public.order_items (organization_id, order_id, position, description, decoration, sizes, quantity)
  select org, o.id, 0, h.description, h.decoration, h.sizes::jsonb, h.qty
  from h
  join public.orders o on o.organization_id = org and o.number = h.number
  where not exists (select 1 from public.order_items i where i.order_id = o.id);

  insert into public.order_events (organization_id, order_id, message, created_at)
  select org, o.id, e.message, e.at
  from h
  join public.orders o on o.organization_id = org and o.number = h.number
  cross join lateral (values
    ('Work order received from ' || h.rep, h.received),
    ('Proof version 1 sent to ' || h.rep, h.received + interval '2 hours'),
    ('Proof approved by ' || h.rep, h.received + interval '1 day 3 hours'),
    ('Scheduled for press', h.received + interval '1 day 4 hours'),
    ('Production started', (h.press + time '08:00') at time zone tz),
    ('Moved to finishing', (h.press + time '14:00') at time zone tz),
    ('Packed: boxes weighed and photographed', h.shipped - interval '3 hours'),
    ('Shipped by UPS Ground', h.shipped),
    ('Invoice sent', h.invoiced),
    ('Payment received', h.paid)
  ) as e(message, at)
  where e.at is not null
    and not exists (select 1 from public.order_events x where x.order_id = o.id);
end $$;
