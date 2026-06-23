-- =====================================================================
-- 047 — Durcissement du socle (sprint 21 / Chantier 0)
-- =====================================================================
-- Trois items de l'audit 2026-06-23 (§3/§4), non destructifs, idempotents :
--   1. Index sur la FK feed_post_photos.user_id (advisor unindexed_foreign_keys).
--   2. Révocation explicite de l'EXECUTE de get_spots_for_scoring à anon/authenticated
--      (défense en profondeur — déjà effectivement restreint à service_role/postgres).
--   3. catches_for_viewer : décision D-2 documentée (definer ASSUMÉ — voir bloc 3).
--
-- ⚠️ APPLICATION (John) : ce fichier contient `CREATE INDEX CONCURRENTLY`, qui NE
--    PEUT PAS tourner dans une transaction. Appliquer hors transaction :
--      - SQL Editor : exécuter les blocs un par un, OU
--      - psql : `psql "$DB_URL" -f 047_hardening_socle.sql` (sans -1/--single-transaction),
--      - `supabase db push` enveloppe en transaction → l'index concurrent ÉCHOUERA :
--        jouer l'index à part, ou remplacer temporairement par un index non concurrent
--        (la table est minuscule aujourd'hui, le lock est instantané).
-- Après application : régénérer lib/types.ts + relancer get_advisors.
-- =====================================================================

-- ── 1. Index FK manquant : feed_post_photos.user_id ──────────────────────────
-- Advisor `unindexed_foreign_keys`. Non concurrent-bloquant aux volumes actuels,
-- mais CONCURRENTLY par discipline (évite tout lock d'écriture en prod).
create index concurrently if not exists feed_post_photos_user_id_idx
  on public.feed_post_photos (user_id);

-- ── 2. get_spots_for_scoring : EXECUTE réservé au cron ───────────────────────
-- Cette RPC (cron de scoring, 016/025) renvoie des lng/lat BRUTS sans gate de tier.
-- Vérifié (2026-06-23) : seul le job `lib/scoring/spot-scores-job.ts` l'appelle via
-- le client service-role (admin), et l'ACL ne liste déjà que postgres + service_role
-- (ni PUBLIC, ni anon, ni authenticated). Ce REVOKE est donc une défense en profondeur
-- explicite + idempotente : il documente l'intention et survit à un futur GRANT PUBLIC
-- accidentel. N'affecte pas le cron (service_role conserve l'EXECUTE).
revoke execute on function public.get_spots_for_scoring() from public;
revoke execute on function public.get_spots_for_scoring() from anon;
revoke execute on function public.get_spots_for_scoring() from authenticated;

-- ── 3. catches_for_viewer : DÉCISION D-2 = definer ASSUMÉ (pas de changement) ─
-- L'advisor `security_definer_view` signale catches_for_viewer ET spots_for_viewer.
-- Le sprint 11.6 (031) a passé 3 vues en security_invoker mais a GARDÉ ces deux-là
-- en definer. Faut-il basculer catches_for_viewer en invoker pour éteindre l'advisor ?
--
-- DÉCISION (sprint 21, étayée par le schéma réel) : NON — on garde le definer, assumé,
-- comme spots_for_viewer. Raison (vérifiée) : la vue calcule
--   COALESCE(catch_visible_geom(c.*), c.geom_public)
-- qui référence la LIGNE ENTIÈRE c.* (donc la colonne geom). Or, depuis le verrou
-- colonne 041, anon ET authenticated n'ont AUCUN SELECT table sur catches ni sur
-- catches.geom. En security_invoker, la vue s'exécuterait avec les droits de
-- l'appelant → « permission denied for column geom » pour tout non-propriétaire →
-- RÉGRESSION (fil social, fiches espèces live, profils publics cassés). Le definer
-- est donc nécessaire et sûr : la clause WHERE de la vue reproduit exactement les
-- policies RLS de catches (own OR public OR friends-via-follows). Aucune fuite
-- démontrée — c'est l'advisor qui est trop strict ici.
--
-- (Aucune instruction SQL pour ce bloc : changement délibérément NON appliqué.
--  Si John veut malgré tout l'invoker, il faudra d'abord régler l'accès à geom via
--  la vue — p.ex. exposer une fonction definer dédiée — avant de basculer.)
