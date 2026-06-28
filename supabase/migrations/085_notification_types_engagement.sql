-- 085_notification_types_engagement.sql — Sprint 49, WS-A + WS-B (nouveaux push).
--
-- Ajoute 4 types de notification d'engagement : big_tide (grande marée),
-- followed_catch (prise d'un pêcheur suivi), species_closure (fermeture d'espèce),
-- weekly_digest (récap hebdo). ⚠️ ANTI-RÉGRESSION : on RÉPÈTE la liste COMPLÈTE des
-- 16 types existants (relevée live) + les 4 nouveaux. Dropper un type casserait les
-- notifications déjà émises de ce type.
-- target_type_check (post/catch/comment/spot/outing/null) couvre déjà les besoins
-- (followed_catch→catch, big_tide→spot/null, species_closure/weekly_digest→null).
--
-- ⚠️ Prochain libre = 085 (084 = sprint 48). Migration APPLIQUÉE en prod. Regen types.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    -- 16 types existants (NE PAS retirer)
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder', 'outing_join', 'outing_accepted',
    'optimal_window', 'spot_verified', 'outing_full', 'outing_cancelled', 'outing_message', 'outing_reminder',
    -- 4 nouveaux (sprint 49)
    'big_tide', 'followed_catch', 'species_closure', 'weekly_digest'
  ]::text[]));
