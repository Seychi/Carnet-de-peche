-- =====================================================================
-- Carnet de Pêche — 027 index FK couvrants (sprint 11.5 Bloc A)
-- =====================================================================
-- NON APPLIQUÉE — à relire par John puis jouer via le dashboard.
--
-- Advisor Supabase `unindexed_foreign_keys` : 5 clés étrangères sans index
-- couvrant. Vérifié en prod (2026-06-21) :
--   • feed_likes.user_id   : couvert seulement par le pkey (post_id, user_id),
--                            donc user_id n'est pas en tête → pas exploitable.
--   • feed_posts.moderated_by, reports.reporter_id, reports.resolved_by,
--     spots.created_by      : aucun index.
-- Conséquence : scans séquentiels sur les jointures et les ON DELETE.
-- Sans impact à 38 spots / 14 profils, mais à poser avant la montée en
-- charge (curation 100+ spots, ouverture beta).
--
-- Note : pas de CONCURRENTLY (interdit en migration transactionnelle) ;
-- volumes faibles → création standard sans blocage notable.
-- =====================================================================

create index if not exists feed_likes_user_id_idx      on public.feed_likes (user_id);
create index if not exists feed_posts_moderated_by_idx on public.feed_posts (moderated_by);
create index if not exists reports_reporter_id_idx     on public.reports (reporter_id);
create index if not exists reports_resolved_by_idx     on public.reports (resolved_by);
create index if not exists spots_created_by_idx        on public.spots (created_by);
