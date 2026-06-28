-- 082_profiles_share_skip_optin.sql — Sprint 47, WS-D (partage 1-tap).
--
-- Préférence « ne plus me demander » du dialog d'opt-in de partage. Quand true,
-- useShareCard saute le dialog (rappel geom-free montré une seule fois). Réduit la
-- friction = plus de partages. RLS profiles existante (l'utilisateur édite SON profil).
--
-- ⚠️ Prochain libre = 082. Migration APPLIQUÉE en prod. Regen types ensuite.

alter table public.profiles
  add column if not exists share_skip_optin boolean not null default false;
