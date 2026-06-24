-- 055_notif_optimal_window.sql — Sprint 26, WS-B (notif perso proactive).
--
-- But : autoriser un NOUVEAU type de notification in-app `optimal_window`, émis par
-- le cron /api/crons/personal-window quand le créneau favorable du jour coïncide avec
-- les conditions où TES prises tombent (tendances perso descriptives). C'est le hook
-- de conversion Local/Itinérant : la DONNÉE perso reste gratuite, seule la NOTIF
-- proactive est réservée aux abonnés (gating fait dans le cron, pas en SQL).
--
-- Décision John D-F2 : IN-APP SEUL (pas d'email, pas de web push) → on réutilise la
-- table `notifications` existante (037), aucune nouvelle table.
--
-- ⚠️ Anti-régression (leçon sprints 24/25) : on RÉPÈTE la liste COMPLÈTE des types en
-- vigueur (les 10 de la migration 053) + le nouveau, pour ne RIEN perdre. Le
-- target_type n'a PAS besoin d'évoluer : 'spot' est déjà accepté depuis 043 (et la
-- notif peut aussi avoir target_type = NULL).
--
-- Aucune nouvelle policy : l'écriture de cette notif se fait en service_role (le cron),
-- qui bypasse la RLS insert-service-only (037, WITH CHECK false côté authenticated).

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder',
    'outing_join', 'outing_accepted',
    -- Sprint 26 : créneau favorable perso (cron personal-window, service_role).
    'optimal_window'
  ));
