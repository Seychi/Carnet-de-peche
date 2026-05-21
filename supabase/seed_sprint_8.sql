-- =====================================================================
-- ⚠️⚠️⚠️  DEV / PREVIEW ONLY — NE JAMAIS APPLIQUER EN PRODUCTION  ⚠️⚠️⚠️
-- =====================================================================
-- Sprint 8 — Bloc I : seed du fil communautaire.
-- 6 pêcheurs bretons (29/56/22) + 12 prises + 24 posts (12 texte + 12 ancrés).
-- Idempotent. Mêmes emails que la route /dev/seed-feed → comptes convergents.
-- À exécuter sur stack locale (`supabase db reset`) ou preview branch, JAMAIS prod.
-- =====================================================================

-- Garde-fou : refuse si des profils réels existent.
do $$
begin
  if exists (
    select 1 from public.profiles
    where username is not null
      and username not like 'test_%' and username not like 'seed_%'
      and username not in ('yann_bzh','morgane_29','erwan_56','gwenola','tanguy_22','soaz')
    limit 1
  ) then
    raise exception 'seed_sprint_8.sql : profils réels détectés → refus (ne jamais appliquer en prod).';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1) Comptes auteurs (mot de passe : seed-carnet-2026)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-8000-000000000001','authenticated','authenticated','yann_bzh@carnet.seed',  crypt('seed-carnet-2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-8000-000000000002','authenticated','authenticated','morgane_29@carnet.seed',crypt('seed-carnet-2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-8000-000000000003','authenticated','authenticated','erwan_56@carnet.seed',  crypt('seed-carnet-2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-8000-000000000004','authenticated','authenticated','gwenola@carnet.seed',   crypt('seed-carnet-2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-8000-000000000005','authenticated','authenticated','tanguy_22@carnet.seed', crypt('seed-carnet-2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','',''),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-8000-000000000006','authenticated','authenticated','soaz@carnet.seed',      crypt('seed-carnet-2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}','','','','')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2) Profils + abonnements (le trigger a posé profile + discovery).
-- ---------------------------------------------------------------------
update public.profiles set username='yann_bzh',  display_name='Yann',    home_department='29', techniques='{leurres,surfcasting}', favorite_species='{bar,lieu_jaune}',      avatar_url='https://api.dicebear.com/9.x/thumbs/svg?seed=yann_bzh',  onboarded=true, onboarded_at=now() where id='d0000000-0000-4000-8000-000000000001';
update public.profiles set username='morgane_29',display_name='Morgane', home_department='29', techniques='{surfcasting}',          favorite_species='{dorade_royale,sar}',    avatar_url='https://api.dicebear.com/9.x/thumbs/svg?seed=morgane_29',onboarded=true, onboarded_at=now() where id='d0000000-0000-4000-8000-000000000002';
update public.profiles set username='erwan_56',  display_name='Erwan',   home_department='56', techniques='{leurres}',               favorite_species='{bar,maquereau}',        avatar_url='https://api.dicebear.com/9.x/thumbs/svg?seed=erwan_56',  onboarded=true, onboarded_at=now() where id='d0000000-0000-4000-8000-000000000003';
update public.profiles set username='gwenola',   display_name='Gwen',    home_department='56', techniques='{flottante,surfcasting}', favorite_species='{dorade_royale}',        avatar_url='https://api.dicebear.com/9.x/thumbs/svg?seed=gwenola',   onboarded=true, onboarded_at=now() where id='d0000000-0000-4000-8000-000000000004';
update public.profiles set username='tanguy_22', display_name='Tanguy',  home_department='22', techniques='{leurres}',               favorite_species='{lieu_jaune,bar}',       avatar_url='https://api.dicebear.com/9.x/thumbs/svg?seed=tanguy_22', onboarded=true, onboarded_at=now() where id='d0000000-0000-4000-8000-000000000005';
update public.profiles set username='soaz',      display_name='Soaz',    home_department='22', techniques='{flottante}',             favorite_species='{maquereau,orphie}',     avatar_url='https://api.dicebear.com/9.x/thumbs/svg?seed=soaz',      onboarded=true, onboarded_at=now() where id='d0000000-0000-4000-8000-000000000006';

update public.subscriptions set plan='local', status='active', current_period_end=now() + interval '30 days'
where user_id in (
  'd0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',
  'd0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006'
);

-- ---------------------------------------------------------------------
-- 3) Nettoyage des données de seed précédentes (idempotence).
-- ---------------------------------------------------------------------
delete from public.feed_posts where author_id in (
  'd0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',
  'd0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006'
);
delete from public.catches where user_id in (
  'd0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',
  'd0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006'
);

-- ---------------------------------------------------------------------
-- 4) Prises (rattachées à un spot du département si présent).
-- ---------------------------------------------------------------------
insert into public.catches (id, user_id, spot_id, species, size_cm, weight_g, caught_at, privacy) values
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001',(select id from public.spots where department='29' limit 1),'bar',          62,2400, now()-interval '2 days', 'public'),
  ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002',(select id from public.spots where department='29' limit 1),'dorade_royale',38,1100, now()-interval '4 days', 'public'),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000003',(select id from public.spots where department='56' limit 1),'bar',          55,1800, now()-interval '1 days', 'public'),
  ('e0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000004',(select id from public.spots where department='56' limit 1),'dorade_royale',41,1500, now()-interval '6 days', 'public'),
  ('e0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000005',(select id from public.spots where department='22' limit 1),'lieu_jaune',   48,1200, now()-interval '3 days', 'public'),
  ('e0000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000006',(select id from public.spots where department='22' limit 1),'maquereau',    32, 350, now()-interval '5 days', 'public'),
  ('e0000000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000001',(select id from public.spots where department='29' limit 1),'bar',          70,3100, now()-interval '9 days', 'public'),
  ('e0000000-0000-4000-8000-000000000008','d0000000-0000-4000-8000-000000000003',(select id from public.spots where department='56' limit 1),'maquereau',    30, 300, now()-interval '8 days', 'public'),
  ('e0000000-0000-4000-8000-000000000009','d0000000-0000-4000-8000-000000000005',(select id from public.spots where department='22' limit 1),'lieu_jaune',   52,1400, now()-interval '11 days','public'),
  ('e0000000-0000-4000-8000-000000000010','d0000000-0000-4000-8000-000000000002',(select id from public.spots where department='29' limit 1),'sar',          35, 800, now()-interval '7 days', 'public'),
  ('e0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000004',(select id from public.spots where department='56' limit 1),'dorade_royale',44,1700, now()-interval '12 days','public'),
  ('e0000000-0000-4000-8000-000000000012','d0000000-0000-4000-8000-000000000006',(select id from public.spots where department='22' limit 1),'orphie',       58, 400, now()-interval '10 days','public');

-- ---------------------------------------------------------------------
-- 5) Posts texte libre (12) — dates étalées sur 14 jours.
-- ---------------------------------------------------------------------
insert into public.feed_posts (author_id, region, text, created_at) values
  ('d0000000-0000-4000-8000-000000000001','29','Quelqu''un a tâté le bar ce matin vers la pointe ? Eau claire, petit coef, je tente ce soir au leurre souple.', now()-interval '0 days'),
  ('d0000000-0000-4000-8000-000000000002','29','Alerte : pas mal de déchets sur la plage après la tempête. Pensez à ramener vos lignes, on respecte le spot.', now()-interval '1 days'),
  ('d0000000-0000-4000-8000-000000000003','56','Première sortie surfcasting de la saison demain. Des conseils montage pour la dorade par ici ?', now()-interval '2 days'),
  ('d0000000-0000-4000-8000-000000000004','56','Coef 95 ce week-end, ça va dépoter dans les passes. Qui est chaud ?', now()-interval '3 days'),
  ('d0000000-0000-4000-8000-000000000005','22','Le lieu est bien là en ce moment sur les tombants. Marée descendante = jackpot.', now()-interval '5 days'),
  ('d0000000-0000-4000-8000-000000000006','22','Test du nouveau stickbait aujourd''hui, rien touché mais l''eau était à 11°C, encore un peu froid.', now()-interval '6 days'),
  ('d0000000-0000-4000-8000-000000000001','29','Vent d''ouest 25 nœuds prévu jeudi, je range les cannes. Vous pêchez quand même ?', now()-interval '7 days'),
  ('d0000000-0000-4000-8000-000000000003','56','Beau coucher de soleil et un maquereau en bonus. Parfois ça suffit au bonheur.', now()-interval '8 days'),
  ('d0000000-0000-4000-8000-000000000005','22','Question matos : tresse 12 ou 15 centièmes pour le bord en rocher ? J''arrête pas de me faire couper.', now()-interval '9 days'),
  ('d0000000-0000-4000-8000-000000000002','29','Orphie en surface au lever du jour, ça mord sur petit leurre brillant. La saison démarre.', now()-interval '10 days'),
  ('d0000000-0000-4000-8000-000000000004','56','Spot du môle blindé de touristes le week-end. Allez-y en semaine, tôt le matin.', now()-interval '11 days'),
  ('d0000000-0000-4000-8000-000000000006','22','Bilan du mois : 14 sorties, 9 bredouilles, mais 2 beaux bars. La pêche du bord, c''est de la patience.', now()-interval '13 days');

-- ---------------------------------------------------------------------
-- 6) Posts ancrés sur une prise (12).
-- ---------------------------------------------------------------------
insert into public.feed_posts (author_id, region, text, catch_id, created_at) values
  ('d0000000-0000-4000-8000-000000000001','29','62 du bord au crépuscule, relâché. Quelle baston !',          'e0000000-0000-4000-8000-000000000001', now()-interval '2 days'),
  ('d0000000-0000-4000-8000-000000000002','29','Belle royale au surfcasting.',                                'e0000000-0000-4000-8000-000000000002', now()-interval '4 days'),
  ('d0000000-0000-4000-8000-000000000003','56','55 en chasse ce matin, leurre de surface.',                   'e0000000-0000-4000-8000-000000000003', now()-interval '1 days'),
  ('d0000000-0000-4000-8000-000000000004','56','Dorade pleine page sur tellines.',                            'e0000000-0000-4000-8000-000000000004', now()-interval '6 days'),
  ('d0000000-0000-4000-8000-000000000005','22','Lieu jaune sur le tombant, marée descendante.',               'e0000000-0000-4000-8000-000000000005', now()-interval '3 days'),
  ('d0000000-0000-4000-8000-000000000006','22','Maquereau apéro, les bancs sont là.',                         'e0000000-0000-4000-8000-000000000006', now()-interval '5 days'),
  ('d0000000-0000-4000-8000-000000000001','29','Le poisson de la semaine : 70 cm, record perso !',            'e0000000-0000-4000-8000-000000000007', now()-interval '9 days'),
  ('d0000000-0000-4000-8000-000000000003','56','Maquereaux à la pelle, parfait pour faire des vifs.',         'e0000000-0000-4000-8000-000000000008', now()-interval '8 days'),
  ('d0000000-0000-4000-8000-000000000005','22','52 de lieu, joli combat sur canne light.',                    'e0000000-0000-4000-8000-000000000009', now()-interval '11 days'),
  ('d0000000-0000-4000-8000-000000000002','29','Sar des rochers, têtu comme pas deux.',                       'e0000000-0000-4000-8000-000000000010', now()-interval '7 days'),
  ('d0000000-0000-4000-8000-000000000004','56','Royale du soir sur la passe.',                                'e0000000-0000-4000-8000-000000000011', now()-interval '12 days'),
  ('d0000000-0000-4000-8000-000000000006','22','Orphie vert fluo, marrant à pêcher en surface.',              'e0000000-0000-4000-8000-000000000012', now()-interval '10 days');
