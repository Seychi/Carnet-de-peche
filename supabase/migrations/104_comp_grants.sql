-- 104_comp_grants.sql — Sprint 68 : codes « fondateurs » = abonnement offert (comp).
--
-- Modèle : un code fondateur (invite_codes, repurposé) s'échange via la RPC
-- redeem_comp_code et crée un ENTITLEMENT propre (comp_grants) que current_tier
-- prend en compte : current_tier = max(tier Stripe réel, tier comp actif).
-- On ne crée JAMAIS de fausse ligne dans subscriptions (anti-traîne,
-- cf supabase/README.md) : Stripe reste la seule source d'écriture de sa table.
--
-- ⚠️ current_tier est LA RPC de gating (carte, score, checkout, cron). La logique
-- Stripe existante (migration 021, vérifiée live par pg_get_functiondef le
-- 2026-07-02) est reprise VERBATIM ; on ne fait qu'ajouter la branche comp par
-- max de ranking. Un comp ne downgrade jamais un abonné payant.
--
-- Décision John 2026-07-02 : durée par défaut d'un comp = 6 mois (p_grant_months
-- default 6 dans create_invite_codes ; null = sans expiration, paramétrable au mint).

-- ────────────────────────────────────────────────────────────────────────────
-- 1) invite_codes : le code devient un code COMP (plus un gate d'inscription).
--    Table vide en prod au moment de la migration (vérifié 2026-07-02) : aucun
--    code legacy à migrer, les codes générés seront toujours en MAJUSCULES.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.invite_codes
  add column if not exists grants_tier text not null default 'local'
    check (grants_tier in ('local', 'itinerant')),
  add column if not exists grant_months int
    check (grant_months is null or grant_months >= 1),
  add column if not exists disabled_at timestamptz;

comment on column public.invite_codes.grants_tier is
  'Tier offert à l''échange du code (sprint 68). local par défaut.';
comment on column public.invite_codes.grant_months is
  'Durée du comp en mois (expires_at = now() + N mois au redeem). NULL = sans expiration.';
comment on column public.invite_codes.disabled_at is
  'Code désactivé manuellement par un modérateur (disable_invite_code) : plus échangeable.';

-- Lecture des codes réservée aux modérateurs (liste + copie dans /moderation).
-- La table reste sans policy INSERT/UPDATE/DELETE : tout mint/écriture passe
-- par les RPC SECURITY DEFINER ci-dessous ou le service_role.
drop policy if exists invite_codes_select_moderator on public.invite_codes;
create policy invite_codes_select_moderator
  on public.invite_codes for select
  using (public.is_moderator());

-- ────────────────────────────────────────────────────────────────────────────
-- 2) comp_grants : l'entitlement offert. Un grant ACTIF = non révoqué et
--    (sans expiration ou expiration future).
-- ────────────────────────────────────────────────────────────────────────────

create table public.comp_grants (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  tier        text        not null default 'local' check (tier in ('local', 'itinerant')),
  source_code text        references public.invite_codes(code) on delete set null,
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  revoked_by  uuid        references auth.users(id) on delete set null,
  -- Idempotence : un même user ne peut pas ré-échanger le même code.
  -- (source_code NULL = grant manuel admin : non concerné, NULLs distincts.)
  unique (user_id, source_code)
);

comment on table public.comp_grants is
  'Entitlements offerts (sprint 68) : abonnement comp via code fondateur. current_tier = max(Stripe, comp actif). Écriture uniquement via redeem_comp_code / revoke_comp_grant / service_role.';

-- L'unique (user_id, source_code) couvre les lookups par user_id (tête d'index).
-- Index FK restants pour les advisors perf (cf sprint 58) :
create index comp_grants_source_code_idx on public.comp_grants (source_code);
create index comp_grants_revoked_by_idx on public.comp_grants (revoked_by);

alter table public.comp_grants enable row level security;

-- Lecture : own-only (affichage « Local offert, actif » dans le compte)…
create policy comp_grants_select_own
  on public.comp_grants for select
  using (user_id = (select auth.uid()));

-- …+ modérateurs (liste + révocation dans /moderation).
create policy comp_grants_select_moderator
  on public.comp_grants for select
  using (public.is_moderator());

-- Aucune policy INSERT/UPDATE/DELETE : impossible de se comp soi-même en
-- écrivant la table ; tout passe par les RPC SECURITY DEFINER.

-- ────────────────────────────────────────────────────────────────────────────
-- 3) redeem_comp_code : le caller AUTHENTIFIÉ échange un code contre un comp.
--    Atomique (lock FOR UPDATE sur le code → sérialise les redeems concurrents),
--    idempotent (unique user_id+source_code), erreurs en jsonb lisible.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.redeem_comp_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_code    public.invite_codes%rowtype;
  v_expires timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Codes générés en majuscules : lookup insensible à la casse de saisie.
  select * into v_code
  from public.invite_codes
  where code = upper(trim(p_code))
  for update;

  if not found or v_code.disabled_at is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  -- already_redeemed AVANT exhausted : plus utile pour qui a déjà échangé.
  if exists (
    select 1 from public.comp_grants
    where user_id = v_uid and source_code = v_code.code
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;
  if v_code.uses >= v_code.max_uses then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;

  v_expires := case
    when v_code.grant_months is null then null
    else now() + make_interval(months => v_code.grant_months)
  end;

  insert into public.comp_grants (user_id, tier, source_code, expires_at)
  values (v_uid, v_code.grants_tier, v_code.code, v_expires);

  update public.invite_codes
    set uses = uses + 1
    where code = v_code.code;

  return jsonb_build_object('ok', true, 'tier', v_code.grants_tier, 'expires_at', v_expires);
end;
$$;

comment on function public.redeem_comp_code(text) is
  'Échange un code fondateur contre un comp_grant pour le caller authentifié (sprint 68). Erreurs : auth_required / invalid / expired / already_redeemed / exhausted.';

revoke all on function public.redeem_comp_code(text) from public, anon;
grant execute on function public.redeem_comp_code(text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) create_invite_codes : mint de N codes lisibles (modérateur only).
--    Format FDR-XXXX-XXXX, alphabet sans ambiguïté (pas de 0/O, 1/l/I).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.create_invite_codes(
  p_count        int  default 1,
  p_label        text default null,
  p_max_uses     int  default 1,
  p_grants_tier  text default 'local',
  p_grant_months int  default 6
)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 23 lettres (sans I, L, O) + 8 chiffres (sans 0, 1) = 31 caractères.
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_uid  uuid := auth.uid();
  v_code text;
  i int;
  j int;
begin
  if not public.is_moderator(v_uid) then
    raise exception 'moderator_only';
  end if;
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'invalid_count';
  end if;
  if p_max_uses is null or p_max_uses < 1 or p_max_uses > 10000 then
    raise exception 'invalid_max_uses';
  end if;
  if p_grants_tier is null or p_grants_tier not in ('local', 'itinerant') then
    raise exception 'invalid_tier';
  end if;
  if p_grant_months is not null and (p_grant_months < 1 or p_grant_months > 120) then
    raise exception 'invalid_months';
  end if;

  for i in 1..p_count loop
    loop
      v_code := 'FDR-';
      for j in 1..8 loop
        -- gen_random_bytes (pgcrypto, schéma extensions — qualifié car
        -- search_path est cloué à public) : le léger biais modulo (256 % 31)
        -- est sans enjeu pour un code d'invitation (~39 bits d'entropie).
        v_code := v_code
          || substr(v_alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1);
        if j = 4 then
          v_code := v_code || '-';
        end if;
      end loop;
      begin
        insert into public.invite_codes
          (code, label, max_uses, grants_tier, grant_months, created_by)
        values
          (v_code, p_label, p_max_uses, p_grants_tier, p_grant_months, v_uid);
        exit;
      exception when unique_violation then
        -- Collision (improbable, 31^8) : regénère.
      end;
    end loop;
    return next v_code;
  end loop;
end;
$$;

comment on function public.create_invite_codes(int, text, int, text, int) is
  'Mint N codes fondateurs lisibles (modérateur only, sprint 68). Défauts : 1 usage, tier local, 6 mois (décision John 2026-07-02).';

revoke all on function public.create_invite_codes(int, text, int, text, int) from public, anon;
grant execute on function public.create_invite_codes(int, text, int, text, int) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) revoke_comp_grant : retire un accès offert (modérateur only).
--    current_tier redescend au tier Stripe réel dès l'appel suivant.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.revoke_comp_grant(p_grant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_done boolean;
begin
  if not public.is_moderator(v_uid) then
    raise exception 'moderator_only';
  end if;
  update public.comp_grants
    set revoked_at = now(), revoked_by = v_uid
    where id = p_grant_id and revoked_at is null
    returning true into v_done;
  return coalesce(v_done, false);
end;
$$;

comment on function public.revoke_comp_grant(uuid) is
  'Révoque un comp_grant (modérateur only, sprint 68). false si déjà révoqué ou inconnu (idempotent).';

revoke all on function public.revoke_comp_grant(uuid) from public, anon;
grant execute on function public.revoke_comp_grant(uuid) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) disable_invite_code : désactive un code (plus échangeable), sans toucher
--    aux grants déjà émis (les révoquer un par un si besoin).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.disable_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_done boolean;
begin
  if not public.is_moderator(v_uid) then
    raise exception 'moderator_only';
  end if;
  update public.invite_codes
    set disabled_at = now()
    where code = upper(trim(p_code)) and disabled_at is null
    returning true into v_done;
  return coalesce(v_done, false);
end;
$$;

comment on function public.disable_invite_code(text) is
  'Désactive un code fondateur (modérateur only, sprint 68). Idempotent. Ne révoque pas les grants déjà émis.';

revoke all on function public.disable_invite_code(text) from public, anon;
grant execute on function public.disable_invite_code(text) to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 7) current_tier = max(tier Stripe, tier comp actif).
--    Logique Stripe de la migration 021 reprise VERBATIM (branches identiques,
--    y compris la 3e branche cancel_at_period_end, redondante mais inoffensive).
--    Ranking : anonymous(0) < discovery(1) < local(2) < itinerant(3).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.current_tier(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with sub as (
    select plan, status, trial_end, current_period_end, cancel_at_period_end
    from public.subscriptions
    where user_id = uid
    order by created_at desc
    limit 1
  ),
  stripe_tier as (
    select case
      when not exists (select 1 from sub) then 'discovery'
      when (select status from sub) = 'trialing'
           and (select trial_end from sub) > now()
        then (select plan from sub)
      when (select status from sub) = 'active'
           and (select current_period_end from sub) > now()
        then (select plan from sub)
      when (select status from sub) = 'active'
           and (select cancel_at_period_end from sub) = true
           and (select current_period_end from sub) > now()
        then (select plan from sub)
      else 'discovery'
    end as t
  ),
  comp as (
    -- Grants ACTIFS uniquement : non révoqués, non expirés.
    select tier as t
    from public.comp_grants
    where user_id = uid
      and revoked_at is null
      and (expires_at is null or expires_at > now())
  ),
  candidates as (
    select t from stripe_tier
    union all
    select t from comp
  )
  select case
    when uid is null then 'anonymous'
    else (
      select t
      from candidates
      order by case t
        when 'itinerant' then 3
        when 'local' then 2
        when 'discovery' then 1
        else 0
      end desc
      limit 1
    )
  end;
$$;

comment on function public.current_tier is
  'Source de vérité tier en lecture (lib/auth/tier.ts). = max(tier Stripe — webhook seul écrivain — , tier comp actif — sprint 68). Jamais moins que le Stripe réel.';
