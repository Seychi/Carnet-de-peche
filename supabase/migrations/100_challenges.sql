-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 100 — Défis solo (Sprint 63, capstone Phase B « dopamine »)
--
-- Ajoute les DÉFIS solo, DB-backed, qui consolident le moteur dopamine (XP sprint 60,
-- records sprint 61, séries/badges sprint 62). NON-COMPÉTITIF : aucune comparaison
-- inter-pêcheurs (ça, c'est la Phase E). Tout dérive du carnet PROPRE du pêcheur.
--
-- Décisions John (validées le 2026-07-01, cf docs/sprint-63/RESUME-STATE.md) :
--   • Barème XP « calé sur l'existant » : 40 / 15 / 20 / 20 + saison 50.
--   • Les 3 défis CONSERVATION (release_undersize, respect_closures, declare_sensitive)
--     restent des rappels TS descriptifs (lib/gamification/challenges.ts), 0 XP → PAS ici.
--
-- Objets créés :
--   • challenges                 : définitions seedées (lecture publique des actifs).
--   • user_challenge_progress    : progression par (user, défi), RLS own-only.
--   • recompute_my_challenges()  : recalcule la progression des défis SQL-calculables et
--                                  crédite reward_xp via award_xp (idempotent). Le défi
--                                  « lever du soleil » (criteria.type='sunrise_catch') N'est
--                                  PAS calculable en SQL (aucune heure solaire stockée ;
--                                  suncalc vit en TS) → il est SAUTÉ ici et traité dans le
--                                  domaine applicatif (lib/gamification/challenges-solo.ts,
--                                  écriture en service_role, anti-triche = logique serveur).
--
-- Idempotence XP (gotcha migration 098) : award_xp ne dédoublonne que si ref_type ET
-- ref_id sont NON-NULL (NULLs distincts en index unique). On fournit donc toujours un
-- ref_id stable : ch.id pour 'once'/'seasonal' (crédit 1× à vie) ; md5(ch.id||mois) pour
-- 'monthly' (crédit 1×/mois, re-complétable au changement de mois).
--
-- Sécurité : RLS own-only sur la progression (pattern migration 084) ; RPC SECURITY
-- DEFINER SET search_path='public'. La RPC ajoutera 1 lint advisor
-- `authenticated_security_definer_function_executable` de la CLASSE DÉJÀ ASSUMÉE du
-- projet (cf 098/099) — ce n'est PAS une nouvelle classe, ne pas « corriger ».
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Table challenges (définitions, seedées) ────────────────────────────────
create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text not null,
  icon         text,
  scope        text not null check (scope in ('monthly', 'once', 'seasonal')),
  period_start date,
  period_end   date,
  criteria     jsonb not null,
  reward_xp    integer not null default 0 check (reward_xp >= 0),
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

comment on table public.challenges is
  'Définitions des défis solo (Sprint 63). Seedées, non-compétitifs. criteria.type pilote le calcul de progression dans recompute_my_challenges (sql) OU le domaine TS (sunrise_catch). Lecture publique des défis actifs.';

-- ─── 2. Table user_challenge_progress (RLS own-only) ───────────────────────────
create table if not exists public.user_challenge_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress     integer not null default 0,
  target       integer not null default 1,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index if not exists user_challenge_progress_user_idx
  on public.user_challenge_progress(user_id);
create index if not exists user_challenge_progress_challenge_idx
  on public.user_challenge_progress(challenge_id);

comment on table public.user_challenge_progress is
  'Progression d''un pêcheur sur un défi (Sprint 63). RLS own-only en lecture ; écriture EXCLUSIVEMENT via recompute_my_challenges (definer) ou service_role (sunrise). completed_at posé à la 1re complétion ; remis à NULL pour un défi mensuel dès qu''un nouveau mois repasse sous le seuil.';

-- ─── 3. RLS (activée AVANT les policies, pattern migration 084) ────────────────
alter table public.challenges enable row level security;

-- Défs de défis actifs = lisibles par tous (aucune donnée utilisateur).
drop policy if exists challenges_select_active on public.challenges;
create policy challenges_select_active on public.challenges
  for select to anon, authenticated
  using (active = true);

alter table public.user_challenge_progress enable row level security;

-- SELECT own-only. Aucune policy INSERT/UPDATE/DELETE → l'écriture passe UNIQUEMENT par
-- la RPC definer (owner postgres, bypass RLS) ou le service_role. (select auth.uid())
-- en sous-requête = évite le lint auth_rls_initplan (perf RLS, migration 024).
drop policy if exists user_challenge_progress_select_own on public.user_challenge_progress;
create policy user_challenge_progress_select_own on public.user_challenge_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── 4. RPC recompute_my_challenges : progression + crédit XP idempotent ───────
create or replace function public.recompute_my_challenges()
returns setof public.user_challenge_progress
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_uid         uuid := (select auth.uid());
  ch            record;
  v_progress    integer;
  v_target      integer;
  v_complete    boolean;
  -- Bornes du mois civil FRANÇAIS (Europe/Paris), cohérentes avec les séries (mig. 099) :
  -- on tronque en heure de Paris puis on reconvertit en timestamptz (instant de minuit local
  -- le 1er). Sinon une prise loguée dans l'heure après minuit local basculerait de mois.
  v_month_start timestamptz := (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
  v_month_end   timestamptz := (date_trunc('month', now() at time zone 'Europe/Paris') + interval '1 month') at time zone 'Europe/Paris';
  v_month_key   text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM');
  v_ref_type    text;
  v_ref_id      uuid;
begin
  if v_uid is null then
    raise exception 'auth.uid() is null (authentification requise)';
  end if;

  for ch in select * from public.challenges where active order by sort_order loop
    v_target   := greatest(1, coalesce((ch.criteria->>'count')::integer, 1));
    v_progress := 0;
    v_ref_type := 'challenge';   -- 'once'/'seasonal' : crédit 1× à vie (ref_id = ch.id)
    v_ref_id   := ch.id;

    if (ch.criteria->>'type') = 'distinct_species_month' then
      select count(distinct species) into v_progress
      from public.catches
      where user_id = v_uid
        and caught_at >= v_month_start
        and caught_at <  v_month_end;
      v_ref_type := 'challenge_month';                    -- crédit 1×/mois
      v_ref_id   := md5(ch.id::text || v_month_key)::uuid;

    elsif (ch.criteria->>'type') = 'measured_catch' then
      select count(*) into v_progress
      from public.catches
      where user_id = v_uid and photo_verified_at is not null;

    elsif (ch.criteria->>'type') = 'outing_logged' then
      select count(*) into v_progress
      from public.outings
      where user_id = v_uid;

    elsif (ch.criteria->>'type') = 'species_in_season' then
      select count(*) into v_progress
      from public.catches
      where user_id = v_uid
        and species = (ch.criteria->>'species')
        and (ch.period_start is null or caught_at >= ch.period_start)
        and (ch.period_end   is null or caught_at <  (ch.period_end + interval '1 day'));

    else
      -- Type calculé côté application (ex. 'sunrise_catch' : pas d'heure solaire en base).
      -- On ne touche PAS la ligne de progression ici (le domaine TS l'écrit en service_role).
      continue;
    end if;

    v_complete := v_progress >= v_target;

    insert into public.user_challenge_progress as ucp
      (user_id, challenge_id, progress, target, completed_at, updated_at)
    values
      (v_uid, ch.id, least(v_progress, v_target), v_target,
       case when v_complete then now() else null end, now())
    on conflict (user_id, challenge_id) do update set
      progress = least(v_progress, v_target),
      target   = v_target,
      completed_at = case
        when v_complete and ucp.completed_at is null then now()
        when not v_complete then null
        else ucp.completed_at
      end,
      updated_at = now();

    if v_complete and ch.reward_xp > 0 then
      perform public.award_xp(v_uid, 'challenge', ch.reward_xp, v_ref_type, v_ref_id);
    end if;
  end loop;

  return query
    select * from public.user_challenge_progress where user_id = v_uid;
end;
$$;

comment on function public.recompute_my_challenges() is
  'Recalcule la progression des défis solo SQL-calculables du pêcheur courant (auth.uid()) depuis catches/outings, crédite reward_xp via award_xp à la complétion (idempotent : ref_id=ch.id pour once/seasonal, md5(ch.id||mois) pour monthly). Le défi sunrise_catch est sauté (calculé en TS). Sprint 63.';

revoke all on function public.recompute_my_challenges() from public, anon;
grant execute on function public.recompute_my_challenges() to authenticated;

-- ─── 5. Seed des défis solo (§2.2.5 + événement saisonnier bar) ────────────────
-- Copy : tutoiement, descriptif/positif, jamais de tiret cadratin (CLAUDE.md §6).
-- « once » = tuto une-fois-à-vie ; « monthly » = se ré-ouvre chaque mois ; « seasonal »
-- = borné period_start/end. La saison du bar reste SOLO (« ton plus gros », pas de classement).
insert into public.challenges
  (slug, title, description, icon, scope, period_start, period_end, criteria, reward_xp, sort_order)
values
  ('species_3_month', 'Trois espèces ce mois',
   'Logue trois espèces différentes ce mois-ci. La variété, c''est la marque d''un pêcheur curieux.',
   'fish', 'monthly', null, null,
   '{"type":"distinct_species_month","count":3}'::jsonb, 40, 10),

  ('first_measured', 'Mesure une prise',
   'Ajoute une prise mesurée (longueur réelle et objet de référence sur la photo). C''est ce qui rend tes records fiables.',
   'ruler', 'once', null, null,
   '{"type":"measured_catch","count":1}'::jsonb, 15, 20),

  ('sunrise_catch', 'Pêche au lever du soleil',
   'Logue une prise autour du lever du soleil. L''aube, c''est souvent le meilleur créneau du bord.',
   'sunrise', 'once', null, null,
   '{"type":"sunrise_catch","count":1}'::jsonb, 20, 30),

  ('first_outing', 'Logue une sortie',
   'Note une sortie, même bredouille. Une session sans prise, ça compte aussi dans ta progression.',
   'compass', 'once', null, null,
   '{"type":"outing_logged","count":1}'::jsonb, 20, 40),

  ('season_bar_2026', 'Saison du bar',
   'Attrape ton plus gros bar de la saison. On suit ta meilleure prise, rien qu''à toi.',
   'trophy', 'seasonal', '2026-05-01', '2026-10-31',
   '{"type":"species_in_season","species":"bar","count":1}'::jsonb, 50, 50)
on conflict (slug) do nothing;
