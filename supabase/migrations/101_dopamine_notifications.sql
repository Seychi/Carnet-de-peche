-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 101 — Types de notification « dopamine » proactifs (Sprint 63, Bloc 3)
--
-- L'audit a noté que TOUTES les notifs sont réactives (like/follow/comment). On ajoute
-- les proactives SOLO : passage de niveau, badge débloqué, nouveau record, série en
-- danger, défi complété. AUCUNE notif de rang/classement (ça, c'est la Phase E).
--
-- Ces notifs sont des SELF-NOTIFS (aucun acteur humain) → insérées en service_role avec
-- actor_id = NULL (modèle optimal_window / big_tide, cf app/api/crons/personal-window).
-- L'opt-out par type est géré côté application (profiles.notification_prefs jsonb, clés
-- 'progress' + 'streak_reminder', cf lib/notifications/prefs-meta.ts) : PUSH gaté, in-app
-- toujours créée. Aucune nouvelle colonne, aucune nouvelle table.
--
-- Pattern (migration 085) : on RÉÉCRIT la liste COMPLÈTE (21 valeurs existantes + 5
-- nouvelles) ; dropper un type existant casserait les notifs déjà émises. target_type
-- reste NULL pour ces types (la cible utile vit dans preview_text + l'URL du push).
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    -- Existant (sprints 17 → 50) :
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder', 'outing_join', 'outing_accepted',
    'optimal_window', 'spot_verified', 'outing_full', 'outing_cancelled', 'outing_message',
    'outing_reminder', 'big_tide', 'followed_catch', 'species_closure', 'weekly_digest',
    'nearby_outing',
    -- Sprint 63 (dopamine proactive, solo) :
    'level_up', 'badge_earned', 'new_record', 'streak_danger', 'challenge_completed'
  ));
