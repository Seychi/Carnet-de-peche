-- 067_outings_matching.sql — Sprint 40, WS-A (« La meute » : matching + statut auto).
--
-- But : muscler le co-pêchage (sprint 25) avec un MATCHING par espèce et des
-- transitions de statut automatiques (open ↔ full), SANS jamais exposer de
-- coordonnée (invariant n°1). Le matching se fait sur espèce + département +
-- libellé de zone (area_label, texte), JAMAIS sur un point (décision John D1).
--
-- ⚠️ Numérotation : le brief disait 065, pris au sprint 39 → cette migration = 067.
--
-- Migration APPLIQUÉE en prod via apply_migration. Régénérer lib/types.ts ensuite.

-- ─── 1. Colonnes matching + anti-doublon rappel ───────────────────────────────
-- species : espèces ciblées par la sortie (filtre overlap &&). PAS de spot_id/geom.
-- reminded_at : anti-doublon du rappel veille (WS C, posé par le cron).
alter table public.outing_proposals
  add column if not exists species text[],
  add column if not exists reminded_at timestamptz;

comment on column public.outing_proposals.species is
  'Espèces ciblées par la sortie (matching par overlap). Aucune coordonnée : le matching reste espèce + département + area_label (texte).';

-- Index GIN pour le filtre `species && array[...]`.
create index if not exists outing_proposals_species_idx
  on public.outing_proposals using gin (species);

-- ─── 2. Transition de statut automatique open ↔ full ─────────────────────────
-- Trigger sur outing_participants : après tout changement (insert/update/delete),
-- recompte les acceptés et bascule le statut de la proposition.
--   accepted_count >= capacity  ET status='open'  → 'full'
--   accepted_count <  capacity  ET status='full'  → 'open' (place libérée)
-- Ne touche jamais 'cancelled'/'done', ni les sorties sans capacité (illimitées).
-- SECURITY DEFINER : le trigger doit pouvoir mettre à jour outing_proposals.status
-- même quand l'événement vient d'un participant (la RLS update est host-only).
create or replace function public.sync_outing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_id uuid := coalesce(NEW.proposal_id, OLD.proposal_id);
  v_capacity    int;
  v_status      text;
  v_accepted    int;
begin
  select capacity, status into v_capacity, v_status
  from public.outing_proposals
  where id = v_proposal_id;

  -- Sortie sans capacité (illimitée) ou figée (annulée/passée) → on ne touche à rien.
  if v_capacity is null or v_status in ('cancelled', 'done') then
    return null;
  end if;

  select count(*) into v_accepted
  from public.outing_participants
  where proposal_id = v_proposal_id and status = 'accepted';

  if v_accepted >= v_capacity and v_status = 'open' then
    update public.outing_proposals set status = 'full'
    where id = v_proposal_id and status = 'open';
  elsif v_accepted < v_capacity and v_status = 'full' then
    update public.outing_proposals set status = 'open'
    where id = v_proposal_id and status = 'full';
  end if;

  return null; -- AFTER trigger : valeur de retour ignorée.
end;
$$;

comment on function public.sync_outing_status() is
  'Maintient outing_proposals.status (open ↔ full) selon le nombre d''acceptés vs capacity. Déclenché par les changements sur outing_participants. Ne touche pas cancelled/done.';

drop trigger if exists trg_sync_outing_status on public.outing_participants;
create trigger trg_sync_outing_status
  after insert or update or delete on public.outing_participants
  for each row execute function public.sync_outing_status();

-- ─── 3. Extension du CHECK notif (4 nouveaux types « groupe ») ─────────────────
-- ⚠️ Anti-régression (leçon 024/055) : on RÉPÈTE la liste COMPLÈTE des 12 types en
-- vigueur + les 4 nouveaux. target_type='outing' est déjà accepté (053).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_follower', 'post_liked', 'post_commented', 'catch_commented', 'mention',
    'spot_approved', 'spot_rejected', 'recfishing_reminder',
    'outing_join', 'outing_accepted', 'optimal_window', 'spot_verified',
    -- Sprint 40 : notifs de groupe co-pêchage.
    'outing_full', 'outing_cancelled', 'outing_message', 'outing_reminder'
  ));
