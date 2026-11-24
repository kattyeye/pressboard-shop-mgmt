-- Demo sign-ins for the Go For Effect demo shop.
-- Replace __DEMO_PASSWORD__ before running, and never commit the real one.
-- Run after demo_data.sql.
do $$
declare
  org uuid := (select id from public.organizations where slug = 'go-for-effect');
  pw text := '__DEMO_PASSWORD__';
  u record;
  uid uuid;
begin
  if org is null then
    raise exception 'Run demo_data.sql first';
  end if;

  for u in select * from (values
    ('frances@example.com', 'Frances', 'owner', null),
    ('karl@example.com', 'Karl', 'owner', null),
    ('jamie@example.com', 'Jamie', 'staff', null),
    ('marcus@example.com', 'Marcus Lee', 'sales_rep', 'Marcus Lee'),
    ('dana@example.com', 'Dana Whitfield', 'sales_rep', 'Dana Whitfield')
  ) as v(email, full_name, role, contact_name)
  loop
    select id into uid from auth.users where email = u.email;
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, email_change, email_change_token_new, recovery_token)
      values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', u.email,
              extensions.crypt(pw, extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), uid, uid::text,
              jsonb_build_object('sub', uid::text, 'email', u.email, 'email_verified', true),
              'email', now(), now(), now());
    end if;

    insert into public.memberships (user_id, organization_id, role, contact_id)
    values (uid, org, u.role::public.member_role,
            (select id from public.contacts where organization_id = org and full_name = u.contact_name))
    on conflict (user_id, organization_id) do nothing;
  end loop;
end $$;
