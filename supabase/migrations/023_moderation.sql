-- ============================================================
-- Migration 023 — Sprint 10.6 WS B : modération minimale
--   Un post arnaque (gift cards) est passé : le rate-limit 022 ne
--   filtre que la fréquence et aucune voie admin de suppression
--   n'existe (policies *_delete_own = auteur uniquement).
--   On ajoute un flag profiles.is_moderator + policies ADDITIVES
--   (les policies Postgres sont OR-ées : delete_own reste intact) :
--   un modérateur peut supprimer posts/commentaires et résoudre
--   les signalements. Personne n'est flaggé par défaut — John
--   active son compte à la main après application :
--     update profiles set is_moderator = true where id = '<uuid>';
--   Pas de modération IA (hors périmètre v1).
-- ============================================================
-- Pré-requis : 001→022 appliquées. RLS reste activé partout.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Flag modérateur sur profiles
-- ------------------------------------------------------------
alter table public.profiles
  add column is_moderator boolean not null default false;

comment on column public.profiles.is_moderator is
  'Modérateur du fil : peut supprimer posts/commentaires et résoudre les signalements (023). Flag posé à la main, jamais par défaut.';

-- ------------------------------------------------------------
-- 2) Helper is_moderator() — security definer pour que les
--    policies puissent lire profiles sans dépendre de ses
--    propres policies RLS (même pattern que has_active_subscription).
-- ------------------------------------------------------------
create or replace function public.is_moderator(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_moderator from public.profiles p where p.id = uid),
    false
  );
$$;

comment on function public.is_moderator is
  'true si le profil est modérateur. Utilisé par les policies de modération (023) et les Server Actions feed.ts.';

-- ------------------------------------------------------------
-- 3) Policies ADDITIVES de modération (delete_own inchangées)
-- ------------------------------------------------------------
create policy "feed_posts_delete_moderator"
  on public.feed_posts for delete
  using (public.is_moderator());

create policy "feed_comments_delete_moderator"
  on public.feed_comments for delete
  using (public.is_moderator());

-- ------------------------------------------------------------
-- 4) Les modérateurs traitent les signalements (status,
--    resolved_by, resolved_at). Aucune policy update n'existait :
--    seule cette policy ouvre l'update, et uniquement aux modérateurs.
--    Lecture : reports_select_own_or_mod (002) reste en l'état.
-- ------------------------------------------------------------
create policy "reports_update_moderator"
  on public.reports for update
  using (public.is_moderator())
  with check (public.is_moderator());
