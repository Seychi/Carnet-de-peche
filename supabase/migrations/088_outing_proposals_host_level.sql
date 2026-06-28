-- 088_outing_proposals_host_level.sql — Sprint 50, WS-A (matching enrichi : niveau).
--
-- Expose le niveau de l'hôte (profiles.level : debutant/intermediaire/expert) dans
-- outing_proposals_for_viewer pour filtrer les sorties par niveau. CREATE OR REPLACE :
-- on garde l'ordre exact des colonnes existantes + on AJOUTE host_level EN FIN, et on
-- ré-affirme security_invoker=true (la vue jointait déjà profiles, on ne sort qu'un
-- text de niveau, zéro coordonnée).
--
-- ⚠️ Prochain libre = 088. Migration APPLIQUÉE en prod. Regen types.

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
    p.species,
    pr.level           as host_level
  from public.outing_proposals p
  left join public.profiles pr on pr.id = p.host_id;
