-- =====================================================================
-- Carnet de Pêche — 030 account_deletion_fks (sprint 11.6 WS B / BUG-13)
-- Passe les deux FK vers profiles(id) bloquantes (NO ACTION) en
-- ON DELETE SET NULL, pour que la suppression d'un compte (cascade
-- auth.users -> profiles) réussisse même si l'utilisateur a modéré un
-- post ou résolu un signalement. Le contenu (post / report) subsiste,
-- seul le lien d'attribution est dénullifié.
--
-- Constat (vérifié en prod via pg_constraint le 2026-06-21) :
--   feed_posts_moderated_by_fkey  : FOREIGN KEY (moderated_by) REFERENCES profiles(id)   [NO ACTION]
--   reports_resolved_by_fkey      : FOREIGN KEY (resolved_by)  REFERENCES profiles(id)   [NO ACTION]
-- Ce sont les SEULES FK vers profiles(id) sans ON DELETE ; toutes les
-- autres FK (vers auth.users / catches / spots / profiles) sont déjà
-- CASCADE ou SET NULL.
--
-- Pré-requis : 001 appliquée (tables feed_posts + reports). RLS inchangée.
-- Idempotent : DROP IF EXISTS puis ADD.
-- =====================================================================

-- ------------------------------------------------------------
-- 1) feed_posts.moderated_by -> profiles(id) ON DELETE SET NULL
-- ------------------------------------------------------------
alter table public.feed_posts
  drop constraint if exists feed_posts_moderated_by_fkey;

alter table public.feed_posts
  add constraint feed_posts_moderated_by_fkey
  foreign key (moderated_by) references public.profiles(id) on delete set null;

-- ------------------------------------------------------------
-- 2) reports.resolved_by -> profiles(id) ON DELETE SET NULL
-- ------------------------------------------------------------
alter table public.reports
  drop constraint if exists reports_resolved_by_fkey;

alter table public.reports
  add constraint reports_resolved_by_fkey
  foreign key (resolved_by) references public.profiles(id) on delete set null;
