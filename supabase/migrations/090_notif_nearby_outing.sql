-- 090_notif_nearby_outing.sql — Sprint 50, WS-E (sortie près de toi).
--
-- Nouveau type de notification 'nearby_outing' : quand une sortie co-pêchage s'ouvre
-- dans ton département, on te prévient (event-driven dans proposeOuting, gaté par la
-- pref notification_prefs->>'nearby_outing', service-role + push best-effort).
-- ⚠️ ANTI-RÉGRESSION : on RÉPÈTE les 20 types existants (085) + le nouveau.
--
-- ⚠️ Prochain libre = 090. Migration APPLIQUÉE en prod. Regen types.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder', 'outing_join', 'outing_accepted',
    'optimal_window', 'spot_verified', 'outing_full', 'outing_cancelled', 'outing_message', 'outing_reminder',
    'big_tide', 'followed_catch', 'species_closure', 'weekly_digest',
    'nearby_outing'
  ]::text[]));
