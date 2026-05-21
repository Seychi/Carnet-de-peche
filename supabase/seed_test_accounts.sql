-- =====================================================================
-- ⚠️⚠️⚠️  DEV / PREVIEW ONLY — NE JAMAIS APPLIQUER EN PRODUCTION  ⚠️⚠️⚠️
-- =====================================================================
-- Sprint 8 — Bloc A0 : comptes test pour l'audit RLS + le gating tier.
--
-- Pourquoi ce fichier existe : Stripe n'arrive qu'au sprint 9, donc aucune
-- vraie subscription `local`/`itinerant` n'existe encore. Pour tester le
-- gating tier (RLS + can_post_in_department) il faut de VRAIES lignes en base
-- (le RLS tourne dans Postgres, il ne voit pas un flag env Next).
--
-- Ce script :
--   1. insère 4 comptes dans auth.users (le 5e "anonymous" = absence de compte) ;
--   2. le trigger handle_new_user crée AUTOMATIQUEMENT pour chacun un profile
--      (onboarded=false) + une subscription (plan='discovery', status='active') ;
--   3. on UPDATE ensuite profile (username/home_department/onboarded) et
--      subscription (plan local/itinerant pour ceux qui en ont besoin).
--
-- Idempotent : ré-exécutable (on conflict do nothing sur auth.users + updates).
--
-- À exécuter UNIQUEMENT sur :
--   - une stack Supabase locale (`supabase start` + `supabase db reset`), ou
--   - une preview branch Supabase éphémère.
-- JAMAIS sur le projet cloud de prod (glgciwwnpmgifyhbvxsw).
-- =====================================================================

-- Garde-fou : refuse de tourner si la base ressemble à la prod.
-- (le projet prod héberge des données réelles ; on bloque si > 0 catch réelle non-test)
do $$
begin
  if exists (
    select 1 from public.profiles
    where username is not null
      and username not like 'test_%'
      and username not like 'seed_%'
    limit 1
  ) then
    raise exception
      'seed_test_accounts.sql : des profils réels existent → refus (ne jamais appliquer en prod). Commente ce garde-fou si tu es SÛR d''être en local/preview.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1) Comptes auth.users (mot de passe commun : "test-carnet-2026")
-- ---------------------------------------------------------------------
-- UUID fixes pour pouvoir les référencer dans rls-audit.md.
--   disco_29  : a0000000-0000-0000-0000-000000000029
--   local_29  : b0000000-0000-0000-0000-000000000029
--   local_56  : b0000000-0000-0000-0000-000000000056
--   itin_29   : c0000000-0000-0000-0000-000000000029

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000029',
   'authenticated', 'authenticated', 'test_disco_29@carnet.test',
   crypt('test-carnet-2026', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000029',
   'authenticated', 'authenticated', 'test_local_29@carnet.test',
   crypt('test-carnet-2026', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000056',
   'authenticated', 'authenticated', 'test_local_56@carnet.test',
   crypt('test-carnet-2026', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000029',
   'authenticated', 'authenticated', 'test_itin@carnet.test',
   crypt('test-carnet-2026', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2) Profils — le trigger a créé la ligne (onboarded=false), on la complète.
-- ---------------------------------------------------------------------
update public.profiles set
  username = 'test_disco_29', display_name = 'Disco 29',
  home_department = '29', city = 'Brest',
  level = 'debutant', techniques = '{leurres}', favorite_species = '{bar}',
  onboarded = true, onboarded_at = now()
where id = 'a0000000-0000-0000-0000-000000000029';

update public.profiles set
  username = 'test_local_29', display_name = 'Local 29',
  home_department = '29', city = 'Quimper',
  level = 'intermediaire', techniques = '{leurres,surfcasting}', favorite_species = '{bar,lieu_jaune}',
  onboarded = true, onboarded_at = now()
where id = 'b0000000-0000-0000-0000-000000000029';

update public.profiles set
  username = 'test_local_56', display_name = 'Local 56',
  home_department = '56', city = 'Lorient',
  level = 'intermediaire', techniques = '{surfcasting}', favorite_species = '{dorade_royale}',
  onboarded = true, onboarded_at = now()
where id = 'b0000000-0000-0000-0000-000000000056';

update public.profiles set
  username = 'test_itin', display_name = 'Itinérant',
  home_department = '29', city = 'Concarneau',
  level = 'expert', techniques = '{leurres,surfcasting,flottante}', favorite_species = '{bar,sar,orphie}',
  onboarded = true, onboarded_at = now()
where id = 'c0000000-0000-0000-0000-000000000029';

-- ---------------------------------------------------------------------
-- 3) Subscriptions — le trigger a posé discovery/active. On bascule le plan.
--    disco_29 : on laisse discovery/active (rien à faire).
-- ---------------------------------------------------------------------
update public.subscriptions set
  plan = 'local', status = 'active',
  current_period_end = now() + interval '30 days'
where user_id = 'b0000000-0000-0000-0000-000000000029';

update public.subscriptions set
  plan = 'local', status = 'active',
  current_period_end = now() + interval '30 days'
where user_id = 'b0000000-0000-0000-0000-000000000056';

update public.subscriptions set
  plan = 'itinerant', status = 'active',
  current_period_end = now() + interval '30 days'
where user_id = 'c0000000-0000-0000-0000-000000000029';

-- ---------------------------------------------------------------------
-- 4) Garde-fou post-seed (sprint 9) : current_tier doit refléter les UPDATE.
--    Si la fonction current_tier (migration 021) n'est pas alignée avec les
--    lignes seedées, on échoue bruyamment plutôt que de laisser un gating faux.
-- ---------------------------------------------------------------------
do $$
declare
  expected constant jsonb := jsonb_build_object(
    'a0000000-0000-0000-0000-000000000029', 'discovery',
    'b0000000-0000-0000-0000-000000000029', 'local',
    'b0000000-0000-0000-0000-000000000056', 'local',
    'c0000000-0000-0000-0000-000000000029', 'itinerant'
  );
  k text;
  got text;
begin
  for k in select jsonb_object_keys(expected) loop
    got := public.current_tier(k::uuid);
    if got is distinct from (expected ->> k) then
      raise exception 'seed assert : current_tier(%) = % (attendu %)', k, got, expected ->> k;
    end if;
  end loop;
  raise notice 'seed_test_accounts : current_tier OK pour les 4 comptes test.';
end $$;

-- ---------------------------------------------------------------------
-- Vérif rapide (décommente pour contrôler après exécution) :
-- select p.username, p.home_department, s.plan, s.status, public.current_tier(p.id)
-- from public.profiles p
-- join public.subscriptions s on s.user_id = p.id
-- where p.username like 'test_%'
-- order by p.username;
-- ---------------------------------------------------------------------
