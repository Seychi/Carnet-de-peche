-- =====================================================================
-- ⚠️ LOCAL/E2E ONLY — compte dédié au scénario Playwright « tier upgrade »
-- =====================================================================
-- Le scénario 03 (e2e/03-stripe-trial-upgrade.spec.ts) fait passer ce compte
-- de discovery → local via un webhook Stripe signé. On lui dédie un compte
-- pour ne PAS muter test_disco_29 (utilisé par le scénario 04 du fil).
-- Même pattern que seed_test_accounts.sql (trigger handle_new_user → profile
-- + subscription discovery, puis update du profil).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'test_upgrade_29@carnet.test',
   crypt('test-carnet-2026', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

update public.profiles set
  username = 'test_upgrade_29', display_name = 'Upgrade 29',
  home_department = '29', city = 'Douarnenez',
  level = 'intermediaire', techniques = '{leurres}', favorite_species = '{bar}',
  onboarded = true, onboarded_at = now()
where id = 'd0000000-0000-0000-0000-000000000001';

-- La subscription reste discovery/active (posée par le trigger) : c'est le
-- point de départ du scénario. Assert de cohérence :
do $$
begin
  if public.current_tier('d0000000-0000-0000-0000-000000000001'::uuid) is distinct from 'discovery' then
    raise exception 'seed_e2e : test_upgrade_29 doit démarrer en discovery';
  end if;
end $$;

-- =====================================================================
-- ⚠️ LOCAL/E2E ONLY — compte dédié au scénario Playwright « downgrade »
-- =====================================================================
-- Le scénario 05 (e2e/05-stripe-downgrade.spec.ts) fait un round-trip
-- discovery → local (webhook .created) → discovery (webhook .deleted). Compte
-- dédié pour ne PAS muter les autres comptes test. Même pattern que ci-dessus.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'test_downgrade_29@carnet.test',
   crypt('test-carnet-2026', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

update public.profiles set
  username = 'test_downgrade_29', display_name = 'Downgrade 29',
  home_department = '29', city = 'Douarnenez',
  level = 'intermediaire', techniques = '{leurres}', favorite_species = '{bar}',
  onboarded = true, onboarded_at = now()
where id = 'd0000000-0000-0000-0000-000000000002';

-- Démarre en discovery (subscription posée par le trigger). Assert de cohérence :
do $$
begin
  if public.current_tier('d0000000-0000-0000-0000-000000000002'::uuid) is distinct from 'discovery' then
    raise exception 'seed_e2e : test_downgrade_29 doit démarrer en discovery';
  end if;
end $$;
