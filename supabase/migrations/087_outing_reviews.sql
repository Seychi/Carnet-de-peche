-- 087_outing_reviews.sql — Sprint 50, WS-B (réputation / avis post-sortie).
--
-- Avis entre participants d'une sortie co-pêchage PASSÉE. Note 1-5 + commentaire.
-- Décision John D4 : commentaires NOMINATIFS PUBLICS (la note moyenne ET les
-- commentaires s'affichent sur le profil public du noté). 1 avis par couple
-- (reviewer, reviewee) et par sortie.
--
-- RLS : INSERT par un MEMBRE (hôte ou participant accepté) d'une sortie passée
-- (planned_at < now), sur un AUTRE membre de la même sortie ; SELECT public
-- (avis nominatifs publics, D4) ; DELETE par l'auteur (corriger une erreur) ;
-- la modération supprime via service-role (action modérateur).
--
-- ⚠️ Prochain libre = 087 (086 = sprint 49). Migration APPLIQUÉE en prod. Regen types.

create table if not exists public.outing_reviews (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.outing_proposals(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (proposal_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists outing_reviews_reviewee_idx on public.outing_reviews(reviewee_id);
create index if not exists outing_reviews_proposal_idx on public.outing_reviews(proposal_id);

alter table public.outing_reviews enable row level security;

-- INSERT : l'auteur est membre (hôte OU accepté) d'une sortie PASSÉE, et le noté est
-- aussi membre de la MÊME sortie. reviewer_id = moi.
drop policy if exists outing_reviews_insert_member on public.outing_reviews;
create policy outing_reviews_insert_member on public.outing_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewee_id
    -- la sortie est passée et je suis membre
    and exists (
      select 1 from public.outing_proposals p
      where p.id = proposal_id
        and p.planned_at < now()
        and (
          p.host_id = (select auth.uid())
          or exists (
            select 1 from public.outing_participants op
            where op.proposal_id = p.id and op.user_id = (select auth.uid()) and op.status = 'accepted'
          )
        )
    )
    -- le noté est aussi membre de cette sortie (hôte ou accepté)
    and (
      exists (select 1 from public.outing_proposals p where p.id = proposal_id and p.host_id = reviewee_id)
      or exists (
        select 1 from public.outing_participants op
        where op.proposal_id = proposal_id and op.user_id = reviewee_id and op.status = 'accepted'
      )
    )
  );

-- SELECT : public (avis nominatifs publics, D4).
drop policy if exists outing_reviews_select_public on public.outing_reviews;
create policy outing_reviews_select_public on public.outing_reviews
  for select to anon, authenticated
  using (true);

-- DELETE : l'auteur peut retirer son avis (la modération passe par service-role).
drop policy if exists outing_reviews_delete_own on public.outing_reviews;
create policy outing_reviews_delete_own on public.outing_reviews
  for delete to authenticated
  using (reviewer_id = (select auth.uid()));
