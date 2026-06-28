-- 086_profiles_notification_prefs.sql — Sprint 49, WS-C (réglages par type).
--
-- Préférences de notification par type, en jsonb sur profiles (décision John D4 ;
-- modèle des prefs 054). RLS profiles own déjà en place (l'utilisateur édite SON
-- profil) → aucune policy à ajouter. Clés attendues : optimal_window, big_tide,
-- followed_catch, species_closure, weekly_digest. Défaut à la LECTURE = true (une
-- clé absente = type activé) ; on n'écrit que les types explicitement coupés.
--
-- ⚠️ Prochain libre = 086. Migration APPLIQUÉE en prod. Regen types.

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
