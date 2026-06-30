-- 092_fix_outing_reviews_insert.sql — Sprint 51, WS-C (faille RLS avis de sortie).
--
-- Problème : la policy INSERT outing_reviews_insert_member (migration 087) contient
-- une TAUTOLOGIE dans la branche « le noté est aussi membre de cette sortie » :
--   ... from outing_participants op where op.proposal_id = proposal_id ...
-- Le `proposal_id` non qualifié se lie à la colonne `op.proposal_id` (la table de
-- la sous-requête a cette colonne), pas à `outing_reviews.proposal_id`. La clause
-- devient `op.proposal_id = op.proposal_id` → TOUJOURS VRAIE (confirmé live dans
-- pg_policy). Conséquence : on peut poster un avis PUBLIC NOMINATIF (note +
-- commentaire) ciblant N'IMPORTE QUI étant participant accepté d'UNE sortie
-- quelconque, pas forcément la sienne → vecteur de harcèlement / faux avis.
--
-- Correctif : recréer la policy À L'IDENTIQUE de la version déployée (toutes les
-- branches hôte/participant, la condition planned_at < now, reviewer_id = moi),
-- en qualifiant les références à la table externe par `outing_reviews.*` pour
-- lever toute ambiguïté (le seul terme réellement cassé était le dernier
-- op.proposal_id ; on qualifie partout par sécurité).
--
-- Les autres policies (select_public, delete_own) sont inchangées (migration 087).
-- Aucune coordonnée touchée.
--
-- ⚠️ Prochain libre = 092. Regen lib/types.ts après application (pas de nouveau type).

drop policy if exists outing_reviews_insert_member on public.outing_reviews;
create policy outing_reviews_insert_member on public.outing_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewee_id
    -- la sortie est passée et je suis membre (hôte ou accepté)
    and exists (
      select 1 from public.outing_proposals p
      where p.id = outing_reviews.proposal_id
        and p.planned_at < now()
        and (
          p.host_id = (select auth.uid())
          or exists (
            select 1 from public.outing_participants op
            where op.proposal_id = p.id
              and op.user_id = (select auth.uid())
              and op.status = 'accepted'
          )
        )
    )
    -- le noté est aussi membre de CETTE sortie (hôte ou accepté) — le fix est ici :
    -- op.proposal_id doit être comparé à outing_reviews.proposal_id, pas à lui-même.
    and (
      exists (
        select 1 from public.outing_proposals p
        where p.id = outing_reviews.proposal_id
          and p.host_id = outing_reviews.reviewee_id
      )
      or exists (
        select 1 from public.outing_participants op
        where op.proposal_id = outing_reviews.proposal_id
          and op.user_id = outing_reviews.reviewee_id
          and op.status = 'accepted'
      )
    )
  );
