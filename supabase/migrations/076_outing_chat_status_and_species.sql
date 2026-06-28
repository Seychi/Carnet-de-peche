-- 076_outing_chat_status_and_species.sql — Sprint 44, WS-G (co-pêchage).
--
-- Bug (a) : le chat outing_messages reste ÉCRIVABLE après annulation/clôture (les
-- policies 068 ne testent que l'appartenance, jamais le statut de la sortie).
-- Bug (b) : species n'est pas dans outing_proposals_for_viewer → contournement 2-requêtes.
--
-- Décision (critère §164 du brief) : « chat en LECTURE SEULE » après cancelled/done
-- = SELECT reste autorisé (lire le chat fermé, sortie grisée), seul l'INSERT est refusé.
-- Donc : SELECT inchangé (appartenance), INSERT + gate `status IN ('open','full')` sur
-- les DEUX branches (la branche participant ne joignait PAS outing_proposals → on ajoute
-- un EXISTS, sinon un accepté pourrait encore écrire sur une sortie annulée).
--
-- ⚠️ Prochain libre = 076. Migration APPLIQUÉE en prod. Régénérer lib/types.ts ensuite.

-- ─── 1. Chat : INSERT gaté sur le statut de la sortie (SELECT inchangé) ───────
drop policy if exists outing_messages_select_member on public.outing_messages;
drop policy if exists outing_messages_insert_member on public.outing_messages;

-- SELECT : appartenance seule (hôte OU participant accepté), AUCUN gate statut →
-- un membre peut LIRE le chat d'une sortie annulée (lecture seule). Fail-closed :
-- un requested/tiers/anon ne voit toujours rien.
create policy outing_messages_select_member on public.outing_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.outing_proposals p
      where p.id = outing_messages.proposal_id and p.host_id = (select auth.uid())
    )
    or exists (
      select 1 from public.outing_participants op
      where op.proposal_id = outing_messages.proposal_id
        and op.user_id = (select auth.uid()) and op.status = 'accepted'
    )
  );

-- INSERT : écriture réservée à un membre d'une sortie ENCORE ouverte/complète.
-- Dès cancelled/done, aucune branche ne matche → insert refusé (chat fermé).
create policy outing_messages_insert_member on public.outing_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (
        select 1 from public.outing_proposals p
        where p.id = outing_messages.proposal_id
          and p.host_id = (select auth.uid())
          and p.status in ('open', 'full')
      )
      or (
        exists (
          select 1 from public.outing_participants op
          where op.proposal_id = outing_messages.proposal_id
            and op.user_id = (select auth.uid()) and op.status = 'accepted'
        )
        and exists (
          select 1 from public.outing_proposals p
          where p.id = outing_messages.proposal_id and p.status in ('open', 'full')
        )
      )
    )
  );

-- ─── 2. species dans outing_proposals_for_viewer (fin du 2-requêtes) ──────────
-- CREATE OR REPLACE : on conserve l'ordre exact des colonnes existantes et on AJOUTE
-- species EN FIN. security_invoker=true ré-affirmé.
create or replace view public.outing_proposals_for_viewer
with (security_invoker = true) as
  select
    p.id,
    p.host_id,
    p.department,
    p.area_label,
    p.planned_at,
    p.capacity,
    p.status,
    p.notes,
    p.created_at,
    pr.username        as host_username,
    pr.display_name    as host_display_name,
    pr.avatar_url      as host_avatar_url,
    (select count(*) from public.outing_participants op
      where op.proposal_id = p.id and op.status = 'accepted') as accepted_count,
    p.species
  from public.outing_proposals p
  left join public.profiles pr on pr.id = p.host_id;
