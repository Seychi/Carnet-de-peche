-- ============================================================
-- Migration 020 — Sprint 8 : activer Realtime sur les tables du fil
-- ============================================================
-- Sans appartenance à la publication supabase_realtime, les hooks
-- useFeedRealtime / usePostInteractionsRealtime ne reçoivent aucun event.
-- REPLICA IDENTITY FULL sur feed_comments/feed_likes : nécessaire pour que
-- les events DELETE portent les colonnes non-PK (ex: post_id) utilisées comme
-- filtre Realtime côté client.
-- ============================================================

alter publication supabase_realtime add table public.feed_posts;
alter publication supabase_realtime add table public.feed_comments;
alter publication supabase_realtime add table public.feed_likes;

alter table public.feed_comments replica identity full;
alter table public.feed_likes    replica identity full;
