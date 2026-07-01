-- 098_xp_progress.sql — Sprint 60, Bloc 0 (Fondations XP & Rangs — squelette dopamine).
--
-- Pose l'XP RÉELLE, AUDITABLE / RECALCULABLE (ledger) et rétro-active. « Infalsifiable »
-- au sens honnête : chaque octroi est tracé et rejouable, les vecteurs de farm sont bornés
-- (rendements décroissants, unique du ledger, record gaté sur prise photo-vérifiée). Les
-- signaux déclaratifs (released) restent pondérés bas.
--   • xp_events     : ledger append-only (auditable, recalculable) — la SOURCE de vérité.
--   • user_progress : état matérialisé (total_xp) lu par l'UI (rang + barre XP).
--   • award_xp()    : SECURITY DEFINER, insère un événement idempotent puis recalcule le total.
--   • trigger AFTER INSERT ON catches : crédite l'XP dérivable en SQL à chaque prise.
--   • backfill      : rejoue les prises existantes → chaque compte démarre avec un rang.
--
-- Sécurité : le client LIT son progress/ledger (RLS own-only), il n'ÉCRIT JAMAIS l'XP.
-- Seules les fonctions definer (owner postgres) écrivent. award_xp n'est PAS exécutable par
-- anon/authenticated (REVOKE) → pas d'auto-octroi possible.
--
-- Barème (audit §2.2.1) et NOMS de rangs (dans levels.ts) = PROPOSITION à valider (⚠️ John).
-- Pattern calqué sur 084_spot_confirmations.sql (RLS d'abord) + broadcast_public_catch
-- (trigger SECURITY DEFINER owner postgres). Dernier appliqué = 097 → 098 libre.
--
-- ⚠️ Décisions notées (cf docs/sprint-60/RECAP.md) :
--   • Pas de colonne `measured` en base → « mesurée » = photo_verified_at IS NOT NULL
--     (même définition que le badge prise_mesuree, migration 066).
--   • `personal_best` : prise PHOTO-VÉRIFIÉE (photo_verified_at) dont measured_length_cm bat
--     STRICTEMENT le meilleur mesuré+vérifié antérieur de l'espèce. La photo-vérification est
--     exigée (sinon une longueur auto-déclarée croissante fictive farmerait +30). La 1re prise
--     vérifiée d'une espèce n'est pas un record (rien à battre).
--   • Rendements décroissants groupés par JOUR D'ENREGISTREMENT (created_at), pas caught_at
--     → anti-farm (caught_at est déclaratif/antidatable ; created_at ne l'est pas).
--   • `release_undersize` (+8) NON traité ici : aucune table de maille en DB (la
--     réglementation vit côté app, lib/regulation/). À déférer en Server Action (Sprint 61/62).
--   • Suppression d'une prise : on NE révoque PAS l'XP en v1 (le ledger reste ; l'unique +
--     rendements décroissants évitent le farm). Documenté, pas sur-ingénieré.

-- ─── 1. Ledger append-only ─────────────────────────────────────────────────────
create table if not exists public.xp_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  points      int  not null,
  ref_type    text,
  ref_id      uuid,
  created_at  timestamptz not null default now(),
  -- Idempotence anti double-octroi : un (user, kind, ref) ne crédite qu'une fois.
  -- NB : pour de futurs kinds à ref NULL (série, sprint 62), NULL ≠ NULL dans un unique
  -- → prévoir une autre stratégie d'idempotence (les kinds « catch » ont tous une ref_id).
  unique (user_id, kind, ref_type, ref_id)
);
-- L'index de la contrainte unique (user_id en tête) couvre les lookups par user_id
-- ET la FK user_id → pas d'index séparé (évite un unused_index).

comment on table public.xp_events is
  'Ledger append-only de l''XP (Sprint 60). Source de vérité, recalculable. Écrit UNIQUEMENT par award_xp (SECURITY DEFINER). Le client le lit en own-only (RLS), jamais en écriture.';

-- ─── 2. État matérialisé ───────────────────────────────────────────────────────
create table if not exists public.user_progress (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  total_xp            bigint not null default 0,
  -- Séries : colonnes posées ici, REMPLIES au Sprint 62 (laissées à 0/NULL pour l'instant).
  current_week_streak int    not null default 0,
  longest_week_streak int    not null default 0,
  last_active_week    date,
  updated_at          timestamptz not null default now()
);

comment on table public.user_progress is
  'État XP matérialisé (Sprint 60) : total_xp = somme du ledger xp_events. Le NIVEAU/RANG se calcule en TS (lib/gamification/levels.ts, source unique). Colonnes *_streak posées mais remplies au Sprint 62.';

-- ─── 3. award_xp : octroi idempotent + recalcul du total ───────────────────────
-- SECURITY DEFINER (owner postgres) : contourne le RLS du ledger pour écrire, alors que le
-- client n'a aucun droit d'écriture. Idempotente : ON CONFLICT DO NOTHING sur l'unique, puis
-- total_xp = SUM(points). La rejouer ne double jamais l'XP (base de la recalculabilité).
create or replace function public.award_xp(
  p_user_id  uuid,
  p_kind     text,
  p_points   int,
  p_ref_type text default null,
  p_ref_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.xp_events (user_id, kind, points, ref_type, ref_id)
  values (p_user_id, p_kind, p_points, p_ref_type, p_ref_id)
  on conflict (user_id, kind, ref_type, ref_id) do nothing;

  -- Idempotence : n'incrémenter QUE si l'event vient RÉELLEMENT d'être inséré (FOUND) ;
  -- s'il existait déjà (ON CONFLICT DO NOTHING → 0 ligne), il est déjà crédité → on ne
  -- double pas. Incrément ATOMIQUE (+ p_points via ON CONFLICT DO UPDATE = row-lock sur la
  -- ligne user_progress) → pas de lost-update sous inserts concurrents, et O(1) par octroi
  -- (plus de SUM du ledger entier à chaque prise). Réconciliation de sûreté en fin de
  -- migration (§6) : total_xp reste == somme du ledger, recalculable.
  if not found then
    return;
  end if;

  insert into public.user_progress (user_id, total_xp, updated_at)
  values (p_user_id, p_points, now())
  on conflict (user_id) do update
    set total_xp   = user_progress.total_xp + excluded.total_xp,
        updated_at = now();
end;
$$;

comment on function public.award_xp(uuid, text, int, text, uuid) is
  'Octroi d''XP idempotent (Sprint 60). Insère un event (ON CONFLICT DO NOTHING) puis recalcule user_progress.total_xp. SECURITY DEFINER, NON exécutable par anon/authenticated (REVOKE) — appelée par le trigger catches et, plus tard, par des Server Actions (service_role).';

-- ─── 4. Dérivation de l'XP d'une prise (partagée trigger + backfill) ───────────
-- Prend une ligne `catches` et crédite les kinds dérivables en SQL depuis la ligne +
-- l'historique ANTÉRIEUR de l'utilisateur (ordre (created_at, id) → backfill déterministe et
-- rejouable). SECURITY DEFINER : appelle award_xp (definer) et lit l'historique own sans
-- dépendre du RLS du client.
create or replace function public.award_catch_xp(c public.catches)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_species int;      -- prises ANTÉRIEURES de la même espèce (→ new_species)
  v_prior_best    smallint; -- meilleure longueur mesurée ANTÉRIEURE de l'espèce, prises
                            -- PHOTO-VÉRIFIÉES uniquement (→ personal_best infalsifiable)
  v_same_day      int;      -- prises ANTÉRIEURES, même espèce, même jour d'enregistrement
begin
  select
    count(*) filter (where x.species is not distinct from c.species),
    -- Le record se compare aux SEULES prises mesurées+photo-vérifiées (measured_length_cm
    -- seule = déclaratif pur, farmable → exclu). Aligne le PB sur le standard « records »
    -- de l'audit §2.4 (measured_length_cm + photo_verified_at).
    max(x.measured_length_cm) filter (
      where x.species is not distinct from c.species
        and x.photo_verified_at is not null
    ),
    count(*) filter (
      where x.species is not distinct from c.species
        and date_trunc('day', x.created_at) = date_trunc('day', c.created_at)
    )
  into v_prior_species, v_prior_best, v_same_day
  from public.catches x
  where x.user_id = c.user_id
    and (x.created_at, x.id) < (c.created_at, c.id);

  -- Prise (+10) TOUJOURS, sauf rendements décroissants : au-delà de 3 prises de la même
  -- espèce le même jour (d'enregistrement), la 4e+ ne crédite pas la base (anti-farm).
  if v_same_day < 3 then
    perform public.award_xp(c.user_id, 'catch', 10, 'catch', c.id);
  end if;

  -- Nouvelle espèce (+50) : 1re prise de cette espèce pour cet utilisateur.
  if v_prior_species = 0 then
    perform public.award_xp(c.user_id, 'new_species', 50, 'catch', c.id);
  end if;

  -- Record perso (+30) : prise PHOTO-VÉRIFIÉE dont la longueur bat strictement le meilleur
  -- mesuré+vérifié antérieur de l'espèce. La photo-vérification est exigée pour fermer le
  -- farm (sinon une longueur auto-déclarée croissante fictive octroierait +30 à répétition).
  if c.photo_verified_at is not null
     and c.measured_length_cm is not null
     and v_prior_best is not null
     and c.measured_length_cm > v_prior_best then
    perform public.award_xp(c.user_id, 'personal_best', 30, 'catch', c.id);
  end if;

  -- Prise mesurée (+15) : mesurée avec référence photo (= badge prise_mesuree, 066).
  if c.photo_verified_at is not null then
    perform public.award_xp(c.user_id, 'measured', 15, 'catch', c.id);
  end if;

  -- Relâchée (+4) : geste éthique déclaratif, pondéré bas.
  if c.released is true then
    perform public.award_xp(c.user_id, 'released', 4, 'catch', c.id);
  end if;
end;
$$;

comment on function public.award_catch_xp(public.catches) is
  'Dérive et crédite l''XP d''une prise (Sprint 60), partagée par le trigger AFTER INSERT et le backfill. Utilise l''historique ANTÉRIEUR (ordre created_at,id) → rejouable/idempotent via award_xp.';

-- Fonction trigger + trigger AFTER INSERT SEUL (crédit une fois par prise ; jamais sur UPDATE).
create or replace function public.catches_award_xp_tg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_catch_xp(new);
  return null;
end;
$$;

drop trigger if exists catches_award_xp on public.catches;
create trigger catches_award_xp
  after insert on public.catches
  for each row execute function public.catches_award_xp_tg();

-- ─── 5. RLS : lecture own-only, AUCUNE écriture client ─────────────────────────
alter table public.xp_events     enable row level security;
alter table public.user_progress enable row level security;

-- SELECT own uniquement. Aucune policy INSERT/UPDATE/DELETE → écriture client refusée par RLS.
drop policy if exists xp_events_select_own on public.xp_events;
create policy xp_events_select_own on public.xp_events
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_progress_select_own on public.user_progress;
create policy user_progress_select_own on public.user_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Verrou des grants : anon ne lit rien ; authenticated lit (gaté RLS own) mais n'écrit jamais.
revoke all on public.xp_events     from anon, authenticated;
revoke all on public.user_progress from anon, authenticated;
grant select on public.xp_events     to authenticated;
grant select on public.user_progress to authenticated;

-- Fonctions d'octroi NON exécutables par le client (anti auto-octroi d'XP). Le trigger se
-- déclenche indépendamment des grants EXECUTE ; les appels imbriqués depuis une fonction
-- SECURITY DEFINER (owner postgres) sont autorisés par l'owner, pas par l'appelant d'origine.
revoke all on function public.award_xp(uuid, text, int, text, uuid) from public, anon, authenticated;
revoke all on function public.award_catch_xp(public.catches)        from public, anon, authenticated;
revoke all on function public.catches_award_xp_tg()                 from public, anon, authenticated;
-- Seul service_role peut appeler award_xp (futures Server Actions : release_undersize, sortie…).
grant execute on function public.award_xp(uuid, text, int, text, uuid) to service_role;

-- ─── 5b. Lecture PUBLIQUE du rang (profil public /u/[username]) ─────────────────
-- Le rang + l'XP totale d'un pêcheur sont VOLONTAIREMENT publics sur son profil (toile
-- compétitive, pivot ADN dopamine). user_progress reste RLS own-only ; cette RPC definer
-- expose UNIQUEMENT total_xp (un agrégat opaque : aucune prise, aucun spot, aucune
-- coordonnée). Même pattern que get_spot_confirmation_count (084) → apparaît, comme tous
-- les compteurs publics du projet, dans l'advisor anon/authenticated_security_definer
-- (catégorie déjà assumée, pas une nouvelle classe de warning).
create or replace function public.get_user_xp(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select total_xp from public.user_progress where user_id = p_user_id), 0::bigint);
$$;

grant execute on function public.get_user_xp(uuid) to anon, authenticated;

comment on function public.get_user_xp(uuid) is
  'XP totale publique d''un pêcheur (Sprint 60), pour le rang affiché sur son profil. Expose UNIQUEMENT total_xp (agrégat, zéro fuite de prise/spot). user_progress reste RLS own-only.';

-- ─── 6. Backfill idempotent : rejouer les prises existantes ────────────────────
-- Ordre chronologique (created_at, id) → new_species / personal_best / diminishing returns se
-- calculent sur l'historique correct. L'unique du ledger garantit qu'un re-run ne double pas.
do $$
declare
  r public.catches;
begin
  for r in
    select * from public.catches order by created_at, id
  loop
    perform public.award_catch_xp(r);
  end loop;
end;
$$;

-- Réconciliation finale (idempotente, passe agrégée UNIQUE) : garantit
-- user_progress.total_xp == somme du ledger pour CHAQUE utilisateur, indépendamment des
-- incréments intermédiaires. C'est la garantie « recalculable » : rejouer ne dérive jamais.
insert into public.user_progress (user_id, total_xp, updated_at)
select user_id, sum(points), now() from public.xp_events group by user_id
on conflict (user_id) do update
  set total_xp = excluded.total_xp, updated_at = now();
